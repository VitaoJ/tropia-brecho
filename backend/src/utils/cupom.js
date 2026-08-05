// Regras de validade do cupom, em um lugar só: a rota de cupons e a de pedidos
// precisam responder exatamente a mesma coisa, senão o cliente aplica no
// carrinho e leva "cupom inválido" na cara só no fim do checkout.

export const normalizarCodigo = (codigo) => String(codigo ?? '').trim().toUpperCase()

/** Motivo pelo qual um cupom não pode ser usado, ou null se estiver válido. */
export function motivoInvalido(cupom) {
  if (!cupom) return 'Cupom não encontrado'
  if (!cupom.active) return 'Cupom desativado'
  if (cupom.valid_until && new Date(cupom.valid_until) < new Date().setHours(0, 0, 0, 0)) {
    return 'Cupom expirado'
  }
  if (cupom.max_uses != null && cupom.uses >= cupom.max_uses) {
    return 'Cupom esgotado'
  }
  return null
}
