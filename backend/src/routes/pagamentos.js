/**
 * Pagamento pelo Mercado Pago (Checkout Bricks).
 *
 * O pedido já existe e já está com as peças reservadas quando o pagamento
 * começa: quem cria pedido é `POST /pedidos`. Aqui só se cobra por um pedido
 * que existe, no valor que está gravado nele.
 *
 * Três regras que não se negociam, e que são os itens críticos do checklist:
 *
 *   1. O valor vem de `orders.total`, nunca do corpo da requisição.
 *   2. A assinatura do webhook é conferida antes de qualquer escrita.
 *   3. O pagamento é reconsultado na API antes de mudar o pedido — o corpo da
 *      notificação diz apenas QUAL pagamento olhar, nunca o que aconteceu.
 */
import { Router } from 'express'
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago'
import { transacao, query } from '../db.js'
import { aplicarStatus } from './pedidos.js'
import {
  CHAVE_PUBLICA, pagamentoAtivo, webhookConfiavel, segredoWebhook,
  clientePagamento, consultarPagamento, statusDoPedidoPara,
  meioConfere, valorConfere,
} from '../utils/mercadoPago.js'

const router = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const texto = (v) => String(v ?? '').trim()

// Uma notificação fora do prazo é replay, não atraso de rede.
const TOLERANCIA_SEGUNDOS = 300

// ─── Configuração para o navegador ──────────────────────────────────
// A chave pública é pública mesmo: ela só serve para tokenizar cartão no
// navegador. O access token, esse nunca sai daqui.
router.get('/config', (_req, res) => {
  res.json({
    ativo: pagamentoAtivo(),
    chave_publica: CHAVE_PUBLICA,
  })
})

/**
 * Registra o que o Mercado Pago disse e devolve se este evento é novo.
 *
 * O índice único em (payment_id, status) é a trava de idempotência: o Mercado
 * Pago reenvia a mesma notificação quando demora a receber 200, e sem isto o
 * mesmo pagamento baixaria a peça e contaria o cupom duas vezes.
 */
async function registrarEvento(cliente, pagamento, pedidoId) {
  const { rows } = await cliente.query(
    `INSERT INTO payment_events (payment_id, order_id, status, status_detail, amount, raw)
          VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (payment_id, status) DO NOTHING
       RETURNING id`,
    [pagamento.id, pedidoId, pagamento.status, pagamento.statusDetalhe,
     pagamento.valor, JSON.stringify(pagamento.bruto)]
  )
  return rows.length > 0
}

/**
 * Leva o pedido para onde o pagamento mandou.
 *
 * Roda em transação e trava o pedido: duas notificações que cheguem juntas
 * (aprovação e atualização, por exemplo) não podem se atropelar.
 *
 * Devolve o que aconteceu, para o log dizer algo útil.
 */
async function aplicarPagamento(pagamento) {
  return transacao(async (cliente) => {
    const { rows: [pedido] } = await cliente.query(
      `SELECT id, status, total, payment_method, payment_id, coupon_id
         FROM orders WHERE id = $1 FOR UPDATE`,
      [pagamento.pedidoId]
    )
    if (!pedido) return { acao: 'pedido-inexistente' }

    const novo = await registrarEvento(cliente, pagamento, pedido.id)
    if (!novo) return { acao: 'repetido', pedido: pedido.id }

    // O que o Mercado Pago cobrou tem que ser o que o pedido vale. Divergiu,
    // não se baixa peça nenhuma: ou é fraude, ou é bug nosso, e os dois
    // pedem olho humano.
    if (pagamento.valor != null && !valorConfere(pedido.total, pagamento.valor)) {
      console.error(
        `Pagamento ${pagamento.id}: valor ${pagamento.valor} difere do pedido ${pedido.id} (${pedido.total})`
      )
      await cliente.query(
        'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
        ['valor_divergente', pedido.id]
      )
      return { acao: 'valor-divergente', pedido: pedido.id }
    }

    // Quem escolheu PIX levou desconto; pagar no cartão com esse desconto
    // sairia mais barato do que a loja combinou.
    if (pagamento.tipo && !meioConfere(pedido.payment_method, pagamento.tipo)) {
      console.error(
        `Pagamento ${pagamento.id}: meio ${pagamento.tipo} difere do combinado (${pedido.payment_method}) no pedido ${pedido.id}`
      )
      await cliente.query(
        'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
        ['meio_divergente', pedido.id]
      )
      return { acao: 'meio-divergente', pedido: pedido.id }
    }

    const destino = statusDoPedidoPara(pagamento.status)

    // Guarda o status do Mercado Pago e o id do pagamento mesmo quando o
    // pedido não anda: é o que explica no painel por que ele parou.
    await cliente.query(
      'UPDATE orders SET payment_status = $1, payment_id = $2, updated_at = NOW() WHERE id = $3',
      [pagamento.status, pagamento.id, pedido.id]
    )

    if (!destino || destino === pedido.status) {
      return { acao: 'sem-mudanca', pedido: pedido.id, status: pagamento.status }
    }

    // Um pedido já pago que recebe "rejected" atrasado não volta atrás: a
    // máquina de status manda, e ela não deixa pular nem retroceder.
    if (pedido.status !== 'pending') {
      return { acao: 'status-nao-permite', pedido: pedido.id, de: pedido.status, para: destino }
    }

    await aplicarStatus(cliente, pedido, destino)
    await cliente.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [destino, pedido.id]
    )
    return { acao: destino, pedido: pedido.id }
  })
}

// ─── Cobrar ─────────────────────────────────────────────────────────
// Chamado pelo Brick do Mercado Pago no navegador. O que chega daqui é
// sempre suspeito: o token do cartão é útil, o valor é ignorado.
router.post('/processar', async (req, res) => {
  if (!pagamentoAtivo()) {
    return res.status(503).json({ erro: 'Pagamento indisponível no momento' })
  }

  const pedidoId = texto(req.body.pedido_id)
  if (!UUID.test(pedidoId)) {
    return res.status(400).json({ erro: 'Pedido inválido' })
  }

  const dados = req.body.pagamento ?? {}
  const metodo = texto(dados.payment_method_id)
  if (!metodo) {
    return res.status(400).json({ erro: 'Meio de pagamento não informado' })
  }

  try {
    const { rows: [pedido] } = await query(
      `SELECT o.id, o.status, o.total, o.payment_method, o.payment_id,
              c.email, c.name AS nome, c.cpf
         FROM orders o JOIN customers c ON c.id = o.customer_id
        WHERE o.id = $1`,
      [pedidoId]
    )
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' })

    if (pedido.status !== 'pending') {
      return res.status(409).json({
        erro: pedido.status === 'paid'
          ? 'Este pedido já foi pago'
          : 'Este pedido não está mais aberto para pagamento',
        status: pedido.status,
      })
    }

    // O meio precisa bater com o que o pedido combinou, senão o desconto do
    // PIX vazaria para o cartão. Recusar aqui é mais barato que estornar.
    const tipoPretendido = metodo === 'pix' ? 'pix' : 'credit_card'
    if (!meioConfere(pedido.payment_method, tipoPretendido)) {
      return res.status(409).json({
        erro: `Este pedido foi fechado para pagamento em ${pedido.payment_method === 'pix' ? 'PIX' : 'cartão'}`,
      })
    }

    const corpo = {
      // O valor é o do banco. O navegador não opina.
      transaction_amount: Number(pedido.total),
      description: `Tropia Brechó · pedido ${String(pedido.id).slice(0, 8).toUpperCase()}`,
      external_reference: pedido.id,
      payment_method_id: metodo,
      payer: {
        email: dados.payer?.email || pedido.email,
        identification: dados.payer?.identification ?? { type: 'CPF', number: pedido.cpf },
      },
    }

    if (metodo !== 'pix') {
      corpo.token = texto(dados.token)
      corpo.installments = Number(dados.installments) || 1
      if (dados.issuer_id) corpo.issuer_id = String(dados.issuer_id)
      if (!corpo.token) return res.status(400).json({ erro: 'Cartão não tokenizado' })
    }

    // Chave de idempotência: o token do cartão é de uso único, então clicar
    // duas vezes em "pagar" reaproveita a mesma cobrança em vez de criar
    // duas. Já uma tentativa nova, com outro cartão, tem outro token e vira
    // outra cobrança — que é o certo depois de uma recusa. No PIX a chave é o
    // pedido: pedir de novo devolve o mesmo QR.
    const chave = `${pedido.id}:${corpo.token || 'pix'}`

    const criado = await clientePagamento().create({
      body: corpo,
      requestOptions: { idempotencyKey: chave },
    })

    // Mesmo tendo acabado de criar, o que vale é o que a API devolve.
    const pagamento = {
      id: String(criado.id),
      status: criado.status,
      statusDetalhe: criado.status_detail ?? null,
      valor: criado.transaction_amount ?? null,
      tipo: criado.payment_type_id ?? null,
      pedidoId: criado.external_reference ?? pedido.id,
      bruto: criado,
    }

    const resultado = await aplicarPagamento(pagamento)
    console.log(`Pagamento ${pagamento.id} criado para ${pedido.id}: ${pagamento.status} → ${resultado.acao}`)

    // Dados do PIX para a tela desenhar o QR. Só o que é público: o código
    // copia-e-cola e a imagem do QR.
    const pix = criado.point_of_interaction?.transaction_data ?? null

    res.json({
      pagamento_id: pagamento.id,
      status: pagamento.status,
      status_detalhe: pagamento.statusDetalhe,
      pedido_status: resultado.acao === 'paid' ? 'paid' : undefined,
      pix: metodo === 'pix' && pix
        ? { qr_code: pix.qr_code ?? null, qr_code_base64: pix.qr_code_base64 ?? null,
            expira_em: pix.expiration_date ?? null }
        : null,
    })
  } catch (err) {
    // O SDK não lança um Error: ele joga o corpo de erro do Mercado Pago cru
    // (`throw await response.json()`), com `message` e uma lista `cause`.
    //
    // Esse motivo VOLTA na resposta de propósito. Antes ele ia só para o log
    // do servidor, e quem está com a loja no ar não tem como ler log do
    // Railway no meio de um atendimento: a falha virava "não deu para
    // concluir" e acabava ali. Não há segredo nesses textos — são sobre a
    // requisição, não sobre a conta.
    const motivos = Array.isArray(err?.cause)
      ? err.cause.map(c => c?.description ?? c?.code).filter(Boolean)
      : []
    const detalhe = [err?.message, ...motivos].filter(Boolean).join(' · ') || null

    console.error(`POST /pagamentos/processar (pedido ${pedidoId}):`, detalhe ?? err)
    res.status(502).json({
      erro: 'Não foi possível processar o pagamento. Tente novamente.',
      detalhe,
    })
  }
})

// ─── Consulta de status ─────────────────────────────────────────────
// A tela do PIX pergunta de tempos em tempos se caiu. Devolve só status —
// nada de valor, dado do pagador ou do cartão.
//
// Esta rota também CONFIRMA o pagamento, não só relata. Sem isso o PIX
// dependeria inteiramente do webhook, e enquanto ele não estiver configurado
// o cliente pagaria, o pedido ficaria pendente e a peça voltaria para a
// vitrine em 30 minutos. Também vale como rede: notificação perdida deixa de
// custar uma venda.
//
// Continua sendo seguro porque não confia no navegador em nada: ele só diz
// qual PEDIDO olhar. O id do pagamento vem do nosso banco, e o que aconteceu
// vem da API do Mercado Pago — o mesmo caminho do webhook.
router.get('/:pedidoId/status', async (req, res) => {
  const pedidoId = texto(req.params.pedidoId)
  if (!UUID.test(pedidoId)) return res.status(400).json({ erro: 'Pedido inválido' })

  try {
    let { rows: [pedido] } = await query(
      'SELECT status, payment_status, payment_id FROM orders WHERE id = $1',
      [pedidoId]
    )
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' })

    if (pedido.status === 'pending' && pedido.payment_id && pagamentoAtivo()) {
      try {
        const pagamento = await consultarPagamento(pedido.payment_id)
        // Só aplica se o pagamento aponta de volta para este pedido: um
        // payment_id trocado no banco não pode confirmar pedido alheio.
        if (pagamento.pedidoId === pedidoId) {
          const r = await aplicarPagamento(pagamento)
          if (r.acao === 'paid' || r.acao === 'cancelled') {
            console.log(`Consulta · pagamento ${pagamento.id} → ${r.acao} (sem webhook)`)
            ;({ rows: [pedido] } = await query(
              'SELECT status, payment_status, payment_id FROM orders WHERE id = $1',
              [pedidoId]
            ))
          }
        }
      } catch (err) {
        // Mercado Pago fora do ar não pode quebrar a tela: devolve o que o
        // banco sabe, e a próxima volta tenta de novo.
        console.error(`Consulta do pagamento ${pedido.payment_id}:`, err?.message)
      }
    }

    res.json({ status: pedido.status, pagamento: pedido.payment_status })
  } catch (err) {
    console.error('GET /pagamentos/:id/status:', err)
    res.status(500).json({ erro: 'Erro ao consultar o pagamento' })
  }
})

// ─── Webhook ────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  // Sem segredo configurado não dá para saber quem está batendo. Recusar é a
  // única resposta honesta: aceitar seria deixar qualquer um marcar pedido
  // como pago sabendo a URL.
  if (!webhookConfiavel()) {
    console.error('Webhook recebido sem MP_WEBHOOK_SECRET configurado — recusado')
    return res.sendStatus(503)
  }

  // A assinatura vem ANTES de ler o corpo para qualquer coisa. O `data.id`
  // usado aqui é o da query, porque é ele que entra no texto assinado.
  const dataId = req.query['data.id'] ?? req.query.id
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId,
      secret: segredoWebhook(),
      toleranceSeconds: TOLERANCIA_SEGUNDOS,
    })
  } catch (err) {
    const motivo = err instanceof InvalidWebhookSignatureError ? err.reason : 'erro'
    console.error(`Webhook recusado (${motivo}) · request-id ${req.headers['x-request-id'] ?? '—'}`)
    return res.sendStatus(401)
  }

  const tipo = texto(req.query.type || req.query.topic || req.body?.type)
  const id = texto(dataId || req.body?.data?.id)

  // O Mercado Pago manda vários assuntos no mesmo endereço. Só pagamento
  // interessa; o resto se responde 200 para ele parar de reenviar.
  if (tipo !== 'payment' || !id) return res.sendStatus(200)

  try {
    // O corpo da notificação diz QUAL pagamento olhar. O que aconteceu com
    // ele só a API conta.
    const pagamento = await consultarPagamento(id)

    if (!pagamento.pedidoId || !UUID.test(pagamento.pedidoId)) {
      console.error(`Webhook: pagamento ${id} sem referência de pedido válida`)
      return res.sendStatus(200)   // não é nosso; reenviar não ajuda
    }

    const resultado = await aplicarPagamento(pagamento)
    console.log(`Webhook · pagamento ${id} (${pagamento.status}) → ${resultado.acao}`)
    res.sendStatus(200)
  } catch (err) {
    // 500 de propósito: o Mercado Pago reenvia, e reenviar é exatamente o que
    // queremos quando o banco piscou. A idempotência segura a repetição.
    console.error(`Webhook · falha ao processar pagamento ${id}:`, err?.message)
    res.sendStatus(500)
  }
})

export default router
