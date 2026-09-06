// Cotação de frete no Melhor Envio.
//
// Endpoint e campos conferidos na documentação oficial:
// POST {base}/api/v2/me/shipment/calculate — cada produto exige width,
// height, length (cm), weight (kg), insurance_value e quantity.
//
// A base fica em variável porque o token de sandbox só funciona no domínio de
// sandbox, e o de produção só no de produção. Trocar de ambiente é trocar as
// duas coisas juntas.
import { dimensoesDe } from './frete.js'

const config = () => ({
  base: process.env.MELHOR_ENVIO_URL ?? 'https://sandbox.melhorenvio.com.br',
  token: process.env.MELHOR_ENVIO_TOKEN,
  origem: String(process.env.MELHOR_ENVIO_CEP_ORIGEM ?? '').replace(/\D/g, ''),
  contato: process.env.MELHOR_ENVIO_CONTATO,
})

export const freteConfigurado = () => {
  const { token, origem, contato } = config()
  return Boolean(token && origem.length === 8 && contato)
}

/**
 * Preços e prazos para levar `pecas` até `cepDestino`.
 *
 * `pecas` são linhas de products já com a categoria (slug) junto. O valor
 * segurado de cada peça é o próprio preço de venda: é o que a loja teria de
 * devolver ao cliente se o pacote sumisse.
 */
export async function cotar(pecas, cepDestino) {
  const { base, token, origem, contato } = config()
  const destino = String(cepDestino ?? '').replace(/\D/g, '')

  if (!freteConfigurado()) throw Object.assign(new Error('Frete não configurado'), { status: 503 })
  if (destino.length !== 8) throw Object.assign(new Error('CEP de destino inválido'), { status: 400 })

  const products = pecas.map(p => {
    const d = dimensoesDe(p, p.categoria_slug)
    return {
      id: p.id,
      width: d.width_cm,
      height: d.height_cm,
      length: d.length_cm,
      weight: d.weight_kg,
      insurance_value: Number(p.price),
      quantity: 1,
    }
  })

  // Alguma peça sem medida própria? A cotação continua, mas o site avisa que
  // é estimativa em vez de deixar o cliente descobrir na etiqueta.
  const estimado = pecas.some(p => dimensoesDe(p, p.categoria_slug).estimado)

  const resposta = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // A API exige identificação da aplicação com um contato técnico
      'User-Agent': `Tropia Brecho (${contato})`,
    },
    body: JSON.stringify({
      from: { postal_code: origem },
      to: { postal_code: destino },
      products,
    }),
  })

  const dados = await resposta.json().catch(() => null)

  if (!resposta.ok || !Array.isArray(dados)) {
    const detalhe = dados?.message ?? dados?.error ?? `HTTP ${resposta.status}`
    throw Object.assign(new Error(`Melhor Envio: ${detalhe}`), { status: 502 })
  }

  // A resposta traz também os serviços que falharam, com o campo `error`.
  // Mostrar um deles como opção daria erro só na hora de gerar a etiqueta.
  const opcoes = dados
    .filter(s => !s.error && s.price != null)
    .map(s => ({
      id: String(s.id),
      nome: s.name,
      empresa: s.company?.name ?? null,
      logo: s.company?.picture ?? null,
      preco: Number(s.price),
      prazoDias: s.delivery_time ?? null,
    }))
    .sort((a, b) => a.preco - b.preco)

  const recusados = dados.filter(s => s.error).map(s => ({ nome: s.name, motivo: s.error }))

  return { opcoes, estimado, recusados }
}
