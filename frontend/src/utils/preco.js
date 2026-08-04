// Regras de preço e frete — mexer aqui muda o site inteiro.

export const FRETE_FIXO = 14.90
export const FRETE_GRATIS_ACIMA_DE = 250.00
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

export const calcularFrete = (subtotal) =>
  subtotal >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_FIXO

const DIAS_PARA_DEIXAR_DE_SER_NOVO = 14

// Formato que os cards do site esperam, vindo do formato da API
export function normalizarProduto(p) {
  return {
    id: p.id,
    nome: p.name,
    preco: Number(p.price),
    tamanho: p.size ?? null,
    imagem: p.images?.[0] ?? null,
    desconto: calcularDesconto(p.price, p.original_price),
    novo: p.created_at
      ? Date.now() - new Date(p.created_at).getTime() < DIAS_PARA_DEIXAR_DE_SER_NOVO * 86400000
      : false,
  }
}
