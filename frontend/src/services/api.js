// Cliente da API Tropia
// Em dev, o proxy do Vite redireciona /api → localhost:3001
// Em produção, VITE_API_URL aponta para o backend no Railway
const BASE = import.meta.env.VITE_API_URL ?? ''

async function req(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const dados = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(dados.erro ?? `API ${res.status}`)
  return dados
}

const get = (path) => req(path)

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

export function listarCategorias() {
  return get('/categorias')
}

/* ─── Admin ──────────────────────────────────────────────────── */
export function loginAdmin(email, senha) {
  return req('/auth/login', { method: 'POST', body: { email, senha } })
}

export function verificarSessao(token) {
  return req('/auth/me', { token })
}

export function listarEstoque(token) {
  return req('/produtos?vendidas=1&limite=100', { token })
}

export function criarProduto(dados, token) {
  return req('/produtos', { method: 'POST', body: dados, token })
}

export function atualizarProduto(id, dados, token) {
  return req(`/produtos/${id}`, { method: 'PUT', body: dados, token })
}

export function excluirProduto(id, token) {
  return req(`/produtos/${id}`, { method: 'DELETE', token })
}

// Formata "98.00" → "R$ 98,00"
export function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`
}
