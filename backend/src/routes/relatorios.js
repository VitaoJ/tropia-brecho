/**
 * Números do painel: visão geral e relatórios.
 *
 * Tudo é contado no banco, não no navegador — somar no cliente exigiria
 * baixar o histórico inteiro e daria respostas diferentes conforme a página
 * aberta.
 *
 * Faturamento conta só pedido que virou dinheiro: pago, enviado ou entregue.
 * Pendente é intenção, e cancelado nunca foi venda. Contar pendente inflaria
 * o número justo no dia em que muita gente abandona o checkout.
 */
import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

// Mesma lista que `PAGO` em pedidos.js. Escrita aqui de novo, e não
// importada, porque um relatório não deve poder quebrar a criação de pedido
// se alguém mexer no arquivo errado.
const PAGO = ['paid', 'shipped', 'delivered']

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const [contagens, faturamento, estoque, porMes, porCategoria, porPagamento, maisVendidas] =
      await Promise.all([
        // Quantos pedidos em cada status — é o que diz o que fazer hoje.
        query('SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status'),

        // Faturamento e ticket médio, no mês e na vida.
        query(
          `SELECT
             COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS mes,
             COALESCE(SUM(total), 0)                                                          AS total,
             COUNT(*)::int                                                                    AS pedidos,
             COALESCE(AVG(total), 0)                                                          AS ticket
           FROM orders WHERE status = ANY($1)`,
          [PAGO]
        ),

        query(`SELECT COUNT(*) FILTER (WHERE NOT sold)::int AS disponiveis,
                      COUNT(*) FILTER (WHERE sold)::int     AS vendidas,
                      COUNT(*) FILTER (WHERE reserved_until > NOW())::int AS reservadas
                 FROM products`),

        // Doze meses, mesmo os vazios: um gráfico com buracos mente sobre a
        // tendência. generate_series preenche o que não teve venda.
        query(
          `SELECT to_char(m.mes, 'YYYY-MM') AS mes,
                  COALESCE(SUM(o.total), 0) AS faturamento,
                  COUNT(o.id)::int          AS pedidos
             FROM generate_series(date_trunc('month', NOW()) - INTERVAL '11 months',
                                  date_trunc('month', NOW()), INTERVAL '1 month') AS m(mes)
        LEFT JOIN orders o ON date_trunc('month', o.created_at) = m.mes
                          AND o.status = ANY($1)
         GROUP BY m.mes ORDER BY m.mes`,
          [PAGO]
        ),

        query(
          `SELECT COALESCE(c.name, 'Sem categoria') AS categoria,
                  COUNT(oi.id)::int                 AS pecas,
                  COALESCE(SUM(oi.price), 0)        AS faturamento
             FROM order_items oi
             JOIN orders o     ON o.id = oi.order_id AND o.status = ANY($1)
        LEFT JOIN products p   ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
         GROUP BY c.name ORDER BY faturamento DESC`,
          [PAGO]
        ),

        query(
          `SELECT payment_method AS forma, COUNT(*)::int AS pedidos,
                  COALESCE(SUM(total), 0) AS faturamento
             FROM orders WHERE status = ANY($1)
         GROUP BY payment_method ORDER BY faturamento DESC`,
          [PAGO]
        ),

        query(
          `SELECT oi.product_name AS nome, oi.product_size AS tamanho, oi.price
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id AND o.status = ANY($1)
         ORDER BY o.created_at DESC LIMIT 10`,
          [PAGO]
        ),
      ])

    const status = Object.fromEntries(contagens.rows.map(r => [r.status, r.n]))
    const f = faturamento.rows[0]

    res.json({
      status: {
        pending: status.pending ?? 0,
        paid: status.paid ?? 0,
        shipped: status.shipped ?? 0,
        delivered: status.delivered ?? 0,
        cancelled: status.cancelled ?? 0,
      },
      faturamento: {
        mes: Number(f.mes),
        total: Number(f.total),
        pedidos: f.pedidos,
        ticket: Number(f.ticket),
      },
      estoque: estoque.rows[0],
      por_mes: porMes.rows.map(r => ({
        mes: r.mes, faturamento: Number(r.faturamento), pedidos: r.pedidos,
      })),
      por_categoria: porCategoria.rows.map(r => ({
        categoria: r.categoria, pecas: r.pecas, faturamento: Number(r.faturamento),
      })),
      por_pagamento: porPagamento.rows.map(r => ({
        forma: r.forma, pedidos: r.pedidos, faturamento: Number(r.faturamento),
      })),
      ultimas_vendidas: maisVendidas.rows.map(r => ({
        nome: r.nome, tamanho: r.tamanho, preco: Number(r.price),
      })),
    })
  } catch (err) {
    console.error('GET /relatorios:', err)
    res.status(500).json({ erro: 'Erro ao montar os relatórios' })
  }
})

export default router
