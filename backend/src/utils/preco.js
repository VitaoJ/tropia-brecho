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
 * @param {number}   freteEscolhido   preço da opção que o cliente escolheu
 * @param {number}   freteMaisBarato  preço da opção mais barata da cotação
 */
export function calcularTotais(precos, percentual = 0, formaPagamento = 'pix',
                               freteEscolhido = null, freteMaisBarato = null) {
  const subtotal = arredondar(precos.reduce((soma, p) => soma + Number(p), 0))
  const desconto = arredondar(subtotal * (percentual / 100))
  const comCupom = arredondar(subtotal - desconto)

  // O frete grátis olha o valor já com cupom — mesma regra da barra do carrinho.
  const frete = calcularFrete(comCupom, freteEscolhido, freteMaisBarato)

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

/**
 * Quanto o cliente paga de frete.
 *
 * Abaixo do mínimo, paga a opção que escolheu. A partir do mínimo, a loja
 * cobre o valor da opção MAIS BARATA e o cliente paga só a diferença se
 * quiser uma mais cara. Sem isso, alguém com R$ 150 no carrinho escolheria
 * SEDEX e a loja pagaria a diferença.
 *
 * `escolhida` e `maisBarata` são os preços vindos da cotação. Enquanto a
 * cotação não estiver ligada, os dois vêm nulos e vale o frete fixo antigo —
 * assim o site continua funcionando durante a transição.
 */
export function calcularFrete(subtotal, escolhida = null, maisBarata = null) {
  const temCotacao = escolhida != null && maisBarata != null
  const cheio = temCotacao ? Number(escolhida) : FRETE_FIXO
  const base  = temCotacao ? Number(maisBarata) : FRETE_FIXO

  if (subtotal < FRETE_GRATIS_ACIMA_DE) return arredondar(cheio)
  return arredondar(Math.max(0, cheio - base))
}
