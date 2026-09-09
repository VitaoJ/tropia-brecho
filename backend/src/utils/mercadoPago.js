/**
 * Mercado Pago: configuração e as regras que não podem morar na rota.
 *
 * Duas ideias sustentam este arquivo:
 *
 *   1. O valor é nosso. O navegador manda o que quiser; o que vale é o que
 *      está em `orders`, gravado quando o pedido foi criado a partir dos
 *      preços do banco. Nenhuma função aqui aceita valor de fora.
 *   2. O que o Mercado Pago diz só vale consultado. O corpo de uma
 *      notificação é dado de quem bateu na porta; a resposta de
 *      `GET /v1/payments/:id` é fato.
 */
import { MercadoPagoConfig, Payment } from 'mercadopago'
import dotenv from 'dotenv'

dotenv.config()

const TOKEN = process.env.MP_ACCESS_TOKEN ?? ''
export const CHAVE_PUBLICA = process.env.MP_PUBLIC_KEY ?? ''
const SEGREDO_WEBHOOK = process.env.MP_WEBHOOK_SECRET ?? ''

/** Sem token não há integração: as rotas respondem 503 em vez de quebrar. */
export const pagamentoAtivo = () => Boolean(TOKEN && CHAVE_PUBLICA)

/** O webhook só é confiável se der para conferir a assinatura. */
export const webhookConfiavel = () => Boolean(SEGREDO_WEBHOOK)

export const segredoWebhook = () => SEGREDO_WEBHOOK

// O timeout evita que uma lentidão do Mercado Pago segure uma conexão do
// nosso pool — foi assim que a API caiu uma vez, por conexão presa.
const config = new MercadoPagoConfig({
  accessToken: TOKEN,
  options: { timeout: 8000 },
})

export const clientePagamento = () => new Payment(config)

/**
 * Qual meio de pagamento o pedido combinou.
 *
 * Importa dinheiro: quem escolhe PIX ganha desconto (DESCONTO_PIX). Se a
 * pessoa escolhe PIX, leva o desconto e depois paga no cartão, a loja perde a
 * diferença. Então o meio efetivamente usado tem que bater com o combinado.
 */
export const MEIOS = {
  pix: 'pix',
  cartao: 'credit_card',
}

/**
 * O `payment_type_id` que o Mercado Pago devolve bate com o meio do pedido?
 *
 * ATENÇÃO aos dois campos, que é onde eu errei: no PIX o Mercado Pago devolve
 * `payment_method_id: "pix"` mas `payment_type_id: "bank_transfer"`. Comparar
 * o TYPE com "pix" reprovava todo pagamento por PIX como divergente — o
 * cliente pagava, o pedido não virava pago e a peça voltava para a vitrine
 * quando a reserva vencia. Confirmado na resposta crua guardada em
 * payment_events.
 *
 * `debit_card` entra junto de `credit_card` porque os dois são cartão para
 * efeito de desconto — nenhum dos dois tem o desconto do PIX.
 */
export function meioConfere(formaDoPedido, tipoNoMercadoPago) {
  if (formaDoPedido === 'pix') return ['bank_transfer', 'pix'].includes(tipoNoMercadoPago)
  return ['credit_card', 'debit_card'].includes(tipoNoMercadoPago)
}

/**
 * O valor cobrado bate com o total do pedido?
 *
 * Comparação em centavos: `0.1 + 0.2 !== 0.3` em ponto flutuante, e um pedido
 * recusado por um centavo de arredondamento seria um bug difícil de achar.
 */
export function valorConfere(totalDoPedido, valorCobrado) {
  return Math.round(Number(totalDoPedido) * 100) === Math.round(Number(valorCobrado) * 100)
}

/**
 * Consulta o pagamento na API e devolve só o que a loja usa.
 *
 * Chamado tanto na criação quanto no webhook, para os dois caminhos julgarem
 * o pagamento pelos mesmos campos.
 */
export async function consultarPagamento(id) {
  const p = await clientePagamento().get({ id: String(id) })
  return {
    id: String(p.id),
    status: p.status,                          // approved, pending, rejected...
    statusDetalhe: p.status_detail ?? null,
    valor: p.transaction_amount ?? null,
    tipo: p.payment_type_id ?? null,           // pix, credit_card, debit_card
    pedidoId: p.external_reference ?? null,    // o id do pedido na Tropia
    bruto: p,
  }
}

/**
 * Para onde o status do Mercado Pago leva o pedido na nossa máquina.
 *
 * `null` quer dizer "não mexe": um pagamento em análise não pode baixar a
 * peça, e também não pode devolvê-la para a vitrine — ele ainda pode ser
 * aprovado, e a reserva de 30 minutos é justamente para isso.
 */
export function statusDoPedidoPara(statusNoMercadoPago) {
  if (statusNoMercadoPago === 'approved') return 'paid'
  if (['rejected', 'cancelled'].includes(statusNoMercadoPago)) return 'cancelled'
  return null
}
