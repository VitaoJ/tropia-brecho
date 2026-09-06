// Regras de preço e frete — mexer aqui muda o site inteiro.

export const FRETE_FIXO = 14.90
export const FRETE_GRATIS_ACIMA_DE = 150.00
export const DESCONTO_PIX = 0.05

export const formatarPreco = (valor) =>
  `R$ ${Number(valor).toFixed(2).replace('.', ',')}`

// A porcentagem é sempre derivada dos dois preços, nunca guardada no banco:
// assim ela não tem como ficar defasada quando o preço muda.
export function calcularDesconto(price, originalPrice) {
  const atual = Number(price)
  const antes = Number(originalPrice)
  if (!originalPrice || !(antes > atual)) return null
  return {
    percentual: Math.round((1 - atual / antes) * 100),
    precoAntes: antes,
  }
}

export const precoComPix = (valor) => Number(valor) * (1 - DESCONTO_PIX)

const arredondar = (v) => Math.round(Number(v) * 100) / 100

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

const DIAS_PARA_DEIXAR_DE_SER_NOVO = 14

// Formato que os cards do site esperam, vindo do formato da API
export function normalizarProduto(p) {
  return {
    id: p.id,
    nome: p.name,
    preco: Number(p.price),
    tamanho: p.size ?? null,
    imagem: p.images?.[0] ?? null,
    // A lista inteira: o card mostra a segunda foto no hover e no arrasto.
    imagens: Array.isArray(p.images) ? p.images : [],
    categoriaSlug: p.categoria_slug ?? null,
    genero: p.gender ?? null,
    vendida: Boolean(p.sold),
    desconto: calcularDesconto(p.price, p.original_price),
    novo: p.created_at
      ? Date.now() - new Date(p.created_at).getTime() < DIAS_PARA_DEIXAR_DE_SER_NOVO * 86400000
      : false,
  }
}
