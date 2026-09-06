// Peso e medidas usados na cotação de frete.
//
// A peça manda quando tem os valores preenchidos. Quando não tem, cai num
// padrão por categoria — num brechó ninguém pesa peça por peça no começo, e
// uma estimativa declarada é melhor que travar a venda.
//
// Os padrões são de peça dobrada em embalagem de envio, não da peça esticada.
// Erram para mais de propósito: frete cotado a menos sai do bolso da loja.
export const PADRAO_POR_CATEGORIA = {
  feminino:   { weight_kg: 0.4, width_cm: 30, height_cm: 6,  length_cm: 22 },
  masculino:  { weight_kg: 0.5, width_cm: 32, height_cm: 7,  length_cm: 24 },
  calcados:   { weight_kg: 0.9, width_cm: 33, height_cm: 13, length_cm: 23 },
  acessorios: { weight_kg: 0.2, width_cm: 20, height_cm: 5,  length_cm: 16 },
}

// Usado quando a peça não tem medidas nem categoria conhecida.
export const PADRAO_GERAL = { weight_kg: 0.5, width_cm: 30, height_cm: 8, length_cm: 22 }

// Mínimos que os Correios aceitam. Um lenço de 1cm de altura seria recusado.
const MINIMOS = { width_cm: 11, height_cm: 2, length_cm: 16 }

/**
 * Dimensões de uma peça para a cotação, e se foram medidas ou estimadas.
 * `peca` é a linha de products; `categoria` é o slug.
 */
export function dimensoesDe(peca, categoria) {
  const padrao = PADRAO_POR_CATEGORIA[categoria] ?? PADRAO_GERAL
  const medida = peca.weight_kg != null && peca.width_cm != null
    && peca.height_cm != null && peca.length_cm != null

  const bruto = medida ? peca : padrao
  return {
    estimado: !medida,
    weight_kg: Number(bruto.weight_kg),
    width_cm:  Math.max(Number(bruto.width_cm),  MINIMOS.width_cm),
    height_cm: Math.max(Number(bruto.height_cm), MINIMOS.height_cm),
    length_cm: Math.max(Number(bruto.length_cm), MINIMOS.length_cm),
  }
}
