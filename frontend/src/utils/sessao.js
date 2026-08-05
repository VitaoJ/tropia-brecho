// Identidade do navegador durante o checkout.
//
// A compra é sem cadastro, então quem "segura" uma peça reservada não é um
// cliente e sim este id. Fica em localStorage e não em sessionStorage de
// propósito: se a pessoa fechar a aba sem querer e voltar, ela reencontra as
// próprias peças em vez de bater na reserva que ela mesma criou.

const CHAVE = 'tropia_sessao'

export function sessaoDoCheckout() {
  let id = null
  try { id = localStorage.getItem(CHAVE) } catch { /* modo privado */ }

  if (!id) {
    id = crypto.randomUUID()
    try { localStorage.setItem(CHAVE, id) } catch { /* segue sem persistir */ }
  }
  return id
}
