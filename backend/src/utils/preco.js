// Regras de preço do lado do servidor.
//
// ATENÇÃO: estes três valores existem também em frontend/src/utils/preco.js.
// O site usa os de lá só para *mostrar* o valor; quem cobra é este arquivo.
// Se mudar um, mude o outro — e o pedido tem uma trava que avisa alto quando
// os dois discordam (ver `conferirTotal` em routes/pedidos.js).
export const FRETE_FIXO = 14.90
export const FRETE_GRATIS_ACIMA_DE = 150.00
export const DESCONTO_PIX = 0.05

export const FORMAS_PAGAMENTO = ['pix', 'credit_card', 'debit_card']

// Dinheiro em ponto flutuante rende centavo fantasma; arredonda a cada etapa.
export const arredondar = (valor) => Math.round(Number(valor) * 100) / 100

/**
 * Fecha a conta de um pedido a partir dos preços que estão no banco.
 * @param {number[]} precos       preço de cada peça, vindo de products.price
 * @param {number}   percentual   desconto do cupom (0 se não houver)
 * @param {string}   formaPagamento
 */
export function calcularTotais(precos, percentual = 0, formaPagamento = 'pix') {
  const subtotal = arredondar(precos.reduce((soma, p) => soma + Number(p), 0))
  const desconto = arredondar(subtotal * (percentual / 100))
  const comCupom = arredondar(subtotal - desconto)

  // O frete grátis olha o valor já com cupom — mesma regra da barra do carrinho.
  const frete = comCupom >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_FIXO

  // Cupom e PIX se acumulam: o PIX incide sobre o valor já com cupom.
  const comPagamento = formaPagamento === 'pix'
    ? arredondar(comCupom * (1 - DESCONTO_PIX))
    : comCupom

  return {
    subtotal,
    desconto,
    frete,
    descontoPix: arredondar(comCupom - comPagamento),
    total: arredondar(comPagamento + frete),
  }
}
