// Limpeza comum dos testes que criam pedidos no banco de produção.
//
// Só desfaz o que pedido de teste fez. Antes ela devolvia para a vitrine TODA
// peça vendida que não estivesse num pedido pago — e desde que o painel ganhou
// "Peça vendida", existe peça vendida fora do site, sem pedido nenhum. Rodar
// um teste desmarcaria a venda dela.
//
// `extras` são peças que o teste mexeu sem pedido (reserva solta, por exemplo).
// Devolve as peças soltas, para o teste conferir que nenhuma ficou presa.
export async function limparPedidosDeTeste(c, extras = []) {
  const { rows: cli } = await c.query(
    "SELECT id FROM customers WHERE email LIKE 'teste%@tropia.com'"
  )
  const ids = cli.map(r => r.id)

  // Antes de apagar os pedidos: as peças que passaram por eles — desta
  // execução ou de uma que morreu no meio —, menos as que estão também num
  // pedido de verdade já pago.
  const { rows: pecas } = await c.query(
    `SELECT DISTINCT oi.product_id AS id
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.customer_id = ANY($1::uuid[]) AND oi.product_id IS NOT NULL
        AND oi.product_id NOT IN (
          SELECT r.product_id FROM order_items r JOIN orders ro ON ro.id = r.order_id
           WHERE ro.status IN ('paid','shipped','delivered')
             AND NOT (ro.customer_id = ANY($1::uuid[]))
             AND r.product_id IS NOT NULL)`,
    [ids]
  )
  const tocadas = [...new Set([...pecas.map(p => p.id), ...extras])]

  await c.query('DELETE FROM orders    WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM addresses WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM customers WHERE id          = ANY($1::uuid[])', [ids])
  await c.query(
    `UPDATE products SET sold = FALSE, reserved_until = NULL, reserved_by = NULL
      WHERE id = ANY($1::uuid[])`,
    [tocadas]
  )
  return tocadas
}

/** O que sobrou: pedidos de teste, e peças mexidas que continuam presas. */
export async function sobrouDoTeste(c, tocadas) {
  const { rows: [n] } = await c.query(
    `SELECT (SELECT COUNT(*) FROM orders o JOIN customers c ON c.id = o.customer_id
              WHERE c.email LIKE 'teste%@tropia.com')::int AS pedidos,
            (SELECT COUNT(*) FROM products
              WHERE id = ANY($1::uuid[]) AND (sold OR reserved_until IS NOT NULL))::int AS presas`,
    [tocadas]
  )
  return n
}
