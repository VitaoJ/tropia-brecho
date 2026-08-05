import { Router } from 'express'
import { query, transacao } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'
import { normalizarCodigo, motivoInvalido } from '../utils/cupom.js'
import { calcularTotais, arredondar, FORMAS_PAGAMENTO } from '../utils/preco.js'

const router = Router()

// ─── Validação ──────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
             'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const so = (valor) => String(valor ?? '').replace(/\D/g, '')
const texto = (valor) => String(valor ?? '').trim()

// CPF inválido só aparece quando o Mercado Pago recusa o pagamento, tarde
// demais. Conferir o dígito aqui evita pedido nascido morto.
function cpfValido(valor) {
  const cpf = so(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (ate) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

function validarPedido(corpo = {}) {
  const erros = []
  const cliente = corpo.cliente ?? {}
  const endereco = corpo.endereco ?? {}

  const nome = texto(cliente.nome)
  // Nome e sobrenome: o Mercado Pago e a etiqueta dos Correios pedem os dois.
  if (nome.length < 3 || !nome.includes(' ')) erros.push('Informe o nome completo')
  if (!EMAIL.test(texto(cliente.email))) erros.push('E-mail inválido')
  if (!cpfValido(cliente.cpf)) erros.push('CPF inválido')
  if (![10, 11].includes(so(cliente.telefone).length)) erros.push('Telefone inválido')

  if (so(endereco.cep).length !== 8) erros.push('CEP inválido')
  if (!texto(endereco.rua)) erros.push('Informe a rua')
  if (!texto(endereco.numero)) erros.push('Informe o número')
  if (!texto(endereco.bairro)) erros.push('Informe o bairro')
  if (!texto(endereco.cidade)) erros.push('Informe a cidade')
  if (!UFS.includes(texto(endereco.estado).toUpperCase())) erros.push('Estado inválido')

  // Peça é única: o mesmo id duas vezes é engano, não duas unidades.
  const itens = [...new Set((Array.isArray(corpo.itens) ? corpo.itens : []).map(texto))]
  if (itens.length === 0) erros.push('O pedido não tem nenhuma peça')
  if (itens.some(id => !UUID.test(id))) erros.push('Há peça com identificador inválido')

  const forma = texto(corpo.forma_pagamento) || 'pix'
  if (!FORMAS_PAGAMENTO.includes(forma)) erros.push('Forma de pagamento inválida')

  return {
    erros,
    dados: {
      cliente: {
        nome,
        email: texto(cliente.email).toLowerCase(),
        cpf: so(cliente.cpf),
        telefone: so(cliente.telefone),
      },
      endereco: {
        cep: so(endereco.cep),
        rua: texto(endereco.rua),
        numero: texto(endereco.numero),
        complemento: texto(endereco.complemento) || null,
        bairro: texto(endereco.bairro),
        cidade: texto(endereco.cidade),
        estado: texto(endereco.estado).toUpperCase(),
      },
      itens,
      cupom: normalizarCodigo(corpo.cupom) || null,
      forma,
      totalEsperado: corpo.total_esperado == null ? null : Number(corpo.total_esperado),
    },
  }
}

// Referência curta para o cliente citar no WhatsApp
const numeroDoPedido = (id) => String(id).slice(0, 8).toUpperCase()

// ─── Criar pedido (público, sem cadastro) ───────────────────────────

router.post('/', async (req, res) => {
  const { erros, dados } = validarPedido(req.body)
  if (erros.length) return res.status(400).json({ erro: erros[0], erros })

  try {
    const resultado = await transacao(async (cliente) => {
      // FOR UPDATE segura as peças até o COMMIT: duas pessoas fechando a
      // mesma peça ao mesmo tempo entram em fila em vez de vender as duas.
      const { rows: pecas } = await cliente.query(
        `SELECT id, name, price, size, sold
           FROM products
          WHERE id = ANY($1::uuid[])
          FOR UPDATE`,
        [dados.itens]
      )

      if (pecas.length !== dados.itens.length) {
        return { status: 404, corpo: { erro: 'Alguma peça do carrinho não existe mais' } }
      }

      const vendidas = pecas.filter(p => p.sold)
      if (vendidas.length) {
        return {
          status: 409,
          corpo: {
            erro: vendidas.length === 1
              ? `A peça "${vendidas[0].name}" acabou de ser vendida`
              : 'Algumas peças acabaram de ser vendidas',
            indisponiveis: vendidas.map(p => ({ id: p.id, nome: p.name })),
          },
        }
      }

      // Cupom revalidado agora: pode ter expirado ou esgotado entre o
      // carrinho e o checkout.
      let cupom = null
      if (dados.cupom) {
        const { rows } = await cliente.query('SELECT * FROM coupons WHERE code = $1', [dados.cupom])
        const invalido = motivoInvalido(rows[0])
        if (invalido) return { status: 400, corpo: { erro: invalido, campo: 'cupom' } }
        cupom = rows[0]
      }

      const totais = calcularTotais(
        pecas.map(p => p.price),
        cupom?.discount_percent ?? 0,
        dados.forma
      )

      // O navegador manda quanto *achava* que ia pagar. Se não bater com a
      // conta do servidor, o pedido para aqui em vez de cobrar um valor que
      // o cliente não viu.
      if (dados.totalEsperado != null
          && Math.abs(arredondar(dados.totalEsperado) - totais.total) > 0.01) {
        return {
          status: 409,
          corpo: { erro: 'O valor do pedido mudou. Confira o resumo e tente de novo.', totais },
        }
      }

      const { rows: [comprador] } = await cliente.query(
        `INSERT INTO customers (name, email, phone, cpf)
              VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
                 SET name = EXCLUDED.name, phone = EXCLUDED.phone, cpf = EXCLUDED.cpf
           RETURNING id`,
        [dados.cliente.nome, dados.cliente.email, dados.cliente.telefone, dados.cliente.cpf]
      )

      const { rows: [endereco] } = await cliente.query(
        `INSERT INTO addresses (customer_id, street, number, complement, district, city, state, zip_code)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [comprador.id, dados.endereco.rua, dados.endereco.numero, dados.endereco.complemento,
         dados.endereco.bairro, dados.endereco.cidade, dados.endereco.estado, dados.endereco.cep]
      )

      const { rows: [pedido] } = await cliente.query(
        `INSERT INTO orders (customer_id, address_id, subtotal, discount, shipping, total,
                             status, payment_method, coupon_id, coupon_code)
              VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9) RETURNING *`,
        [comprador.id, endereco.id, totais.subtotal, totais.desconto, totais.frete,
         totais.total, dados.forma, cupom?.id ?? null, cupom?.code ?? null]
      )

      const valores = pecas.map((_, i) =>
        `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ')
      await cliente.query(
        `INSERT INTO order_items (order_id, product_id, price, product_name, product_size)
              VALUES ${valores}`,
        [pedido.id, ...pecas.flatMap(p => [p.id, p.price, p.name, p.size])]
      )

      return {
        status: 201,
        corpo: {
          pedido: {
            id: pedido.id,
            numero: numeroDoPedido(pedido.id),
            status: pedido.status,
            forma_pagamento: pedido.payment_method,
            cupom: cupom?.code ?? null,
            ...totais,
            itens: pecas.map(p => ({ id: p.id, nome: p.name, tamanho: p.size, preco: Number(p.price) })),
          },
        },
      }
    })

    res.status(resultado.status).json(resultado.corpo)
  } catch (err) {
    console.error('POST /pedidos:', err)
    res.status(500).json({ erro: 'Não foi possível criar o pedido' })
  }
})

// ─── Consulta pública do pedido ─────────────────────────────────────
// Usada na página de sucesso. Devolve só o que o cliente já sabe:
// nada de CPF, telefone ou endereço, porque o id anda em link e histórico.

router.get('/:id/publico', async (req, res) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Pedido não encontrado' })

    const { rows } = await query(
      `SELECT id, status, subtotal, discount, shipping, total, payment_method, created_at
         FROM orders WHERE id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' })

    const { rows: itens } = await query(
      `SELECT oi.product_name, oi.product_size, oi.price, p.images
         FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [req.params.id]
    )

    const pedido = rows[0]
    res.json({
      pedido: {
        numero: numeroDoPedido(pedido.id),
        status: pedido.status,
        forma_pagamento: pedido.payment_method,
        subtotal: Number(pedido.subtotal),
        desconto: Number(pedido.discount),
        frete: Number(pedido.shipping),
        total: Number(pedido.total),
        criado_em: pedido.created_at,
        itens: itens.map(i => ({
          nome: i.product_name,
          tamanho: i.product_size,
          preco: Number(i.price),
          imagem: i.images?.[0] ?? null,
        })),
      },
    })
  } catch (err) {
    console.error('GET /pedidos/:id/publico:', err)
    res.status(500).json({ erro: 'Erro ao buscar pedido' })
  }
})

// ─── Painel ─────────────────────────────────────────────────────────

router.get('/', requireAdmin, async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limite) || 50, 100)
    const pagina = Math.max(Number(req.query.pagina) || 1, 1)
    const status = texto(req.query.status)

    const filtro = status ? 'WHERE o.status = $3' : ''
    const params = [limite, (pagina - 1) * limite, ...(status ? [status] : [])]

    const { rows } = await query(
      `SELECT o.id, o.total, o.status, o.payment_method, o.coupon_code, o.created_at,
              c.name AS cliente, c.email,
              COUNT(oi.id)::int AS pecas
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
         ${filtro}
     GROUP BY o.id, c.name, c.email
     ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2`,
      params
    )

    const { rows: [contagem] } = await query(
      `SELECT COUNT(*)::int AS total FROM orders o ${status ? 'WHERE o.status = $1' : ''}`,
      status ? [status] : []
    )

    res.json({
      pedidos: rows.map(p => ({ ...p, numero: numeroDoPedido(p.id), total: Number(p.total) })),
      total: contagem.total,
    })
  } catch (err) {
    console.error('GET /pedidos:', err)
    res.status(500).json({ erro: 'Erro ao buscar pedidos' })
  }
})

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Pedido não encontrado' })

    const { rows } = await query(
      `SELECT o.*, c.name AS cliente, c.email, c.phone, c.cpf,
              a.street, a.number, a.complement, a.district, a.city, a.state, a.zip_code
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
    LEFT JOIN addresses a ON a.id = o.address_id
        WHERE o.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' })

    const { rows: itens } = await query(
      `SELECT oi.product_id, oi.product_name, oi.product_size, oi.price, p.images
         FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [req.params.id]
    )

    const o = rows[0]
    res.json({
      pedido: {
        id: o.id,
        numero: numeroDoPedido(o.id),
        status: o.status,
        forma_pagamento: o.payment_method,
        payment_id: o.payment_id,
        cupom: o.coupon_code,
        subtotal: Number(o.subtotal),
        desconto: Number(o.discount),
        frete: Number(o.shipping),
        total: Number(o.total),
        criado_em: o.created_at,
        atualizado_em: o.updated_at,
        cliente: { nome: o.cliente, email: o.email, telefone: o.phone, cpf: o.cpf },
        endereco: {
          rua: o.street, numero: o.number, complemento: o.complement,
          bairro: o.district, cidade: o.city, estado: o.state, cep: o.zip_code,
        },
        itens: itens.map(i => ({
          id: i.product_id,
          nome: i.product_name,
          tamanho: i.product_size,
          preco: Number(i.price),
          imagem: i.images?.[0] ?? null,
        })),
      },
    })
  } catch (err) {
    console.error('GET /pedidos/:id:', err)
    res.status(500).json({ erro: 'Erro ao buscar pedido' })
  }
})

// ─── Status ─────────────────────────────────────────────────────────
// Status não pode andar para trás nem pular etapa: um pedido entregue que
// volta para "pago" bagunçaria o estoque e o relatório de vendas.
const TRANSICOES = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const PAGO = ['paid', 'shipped', 'delivered']

/**
 * Efeitos colaterais de mudar o status. Chamado dentro da transação.
 * Confirmar baixa as peças e conta o uso do cupom; cancelar desfaz os dois.
 */
export async function aplicarStatus(cliente, pedido, novo) {
  const eraPago = PAGO.includes(pedido.status)
  const ficaPago = PAGO.includes(novo)

  if (!eraPago && ficaPago) {
    await cliente.query(
      `UPDATE products SET sold = TRUE
        WHERE id IN (SELECT product_id FROM order_items
                      WHERE order_id = $1 AND product_id IS NOT NULL)`,
      [pedido.id]
    )
    if (pedido.coupon_id) {
      await cliente.query('UPDATE coupons SET uses = uses + 1 WHERE id = $1', [pedido.coupon_id])
    }
  }

  if (eraPago && !ficaPago) {
    // Cancelou: a peça volta para a vitrine e o cupom recupera o uso.
    await cliente.query(
      `UPDATE products SET sold = FALSE
        WHERE id IN (SELECT product_id FROM order_items
                      WHERE order_id = $1 AND product_id IS NOT NULL)`,
      [pedido.id]
    )
    if (pedido.coupon_id) {
      await cliente.query(
        'UPDATE coupons SET uses = GREATEST(uses - 1, 0) WHERE id = $1',
        [pedido.coupon_id]
      )
    }
  }
}

router.put('/:id/status', requireAdmin, async (req, res) => {
  const novo = texto(req.body.status)

  try {
    if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Pedido não encontrado' })

    const resultado = await transacao(async (cliente) => {
      const { rows } = await cliente.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [req.params.id])
      if (!rows.length) return { status: 404, corpo: { erro: 'Pedido não encontrado' } }

      const pedido = rows[0]
      const permitidos = TRANSICOES[pedido.status] ?? []
      if (!permitidos.includes(novo)) {
        return {
          status: 400,
          corpo: {
            erro: permitidos.length
              ? `Um pedido "${pedido.status}" só pode virar: ${permitidos.join(', ')}`
              : `Um pedido "${pedido.status}" não muda mais de status`,
          },
        }
      }

      await aplicarStatus(cliente, pedido, novo)
      const { rows: [atualizado] } = await cliente.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
        [novo, pedido.id]
      )
      return { status: 200, corpo: { pedido: atualizado } }
    })

    res.status(resultado.status).json(resultado.corpo)
  } catch (err) {
    console.error('PUT /pedidos/:id/status:', err)
    res.status(500).json({ erro: 'Erro ao atualizar status' })
  }
})

export default router
