// Cliente da API Tropia
// Em dev, o proxy do Vite redireciona /api → localhost:3001
// Em produção, VITE_API_URL aponta para o backend no Railway
const BASE = import.meta.env.VITE_API_URL ?? ''

async function get(path) {
  const res = await fetch(`${BASE}/api${path}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

export function listarProdutos({ categoria, tamanho, genero, condicao, limite, pagina } = {}) {
  const params = new URLSearchParams()
  if (categoria) params.set('categoria', categoria)
  if (tamanho) params.set('tamanho', tamanho)
  if (genero) params.set('genero', genero)
  if (condicao) params.set('condicao', condicao)
  if (limite) params.set('limite', limite)
  if (pagina) params.set('pagina', pagina)
  const qs = params.toString()
  return get(`/produtos${qs ? `?${qs}` : ''}`)
}

export function buscarProduto(id) {
  return get(`/produtos/${id}`)
}

// Formata "98.00" → "R$ 98,00"
export function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`
}
