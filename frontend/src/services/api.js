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
  if (!res.ok) {
    // O corpo do erro vai junto: o checkout precisa saber *quais* peças
    // caíram (`indisponiveis`) e o carrinho, o total certo (`totais`),
    // não só a frase do erro.
    const erro = new Error(dados.erro ?? `API ${res.status}`)
    erro.status = res.status
    Object.assign(erro, dados)
    throw erro
  }
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

// Tamanhos e gêneros que existem no estoque disponível
export function listarFiltros() {
  return get('/produtos/filtros')
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

/* ─── Reserva de peça ────────────────────────────────────────── */

// Segura as peças por 10 minutos. Chamar ao entrar no checkout e a cada etapa
// concluída — avançar é o sinal de que a pessoa está mesmo comprando.
// Erro 409 significa que alguma peça caiu: `indisponiveis` diz quais e por quê.
export function reservarPecas(sessao, itens) {
  return req('/reservas', { method: 'POST', body: { sessao, itens } })
}

// Devolve as peças ao sair do checkout.
//
// Usa sendBeacon quando existe: é o único jeito de o navegador conseguir
// enviar algo enquanto a página está fechando — um fetch normal é cancelado.
// É melhor esforço por natureza: fechar o app no celular, perder sinal ou o
// navegador matar a aba não avisam ninguém. Quem garante mesmo é a expiração
// dos 10 minutos no servidor; isto aqui só devolve a peça mais cedo.
export function liberarPecas(sessao) {
  const url = `${BASE}/api/reservas/liberar`
  const corpo = JSON.stringify({ sessao })

  if (navigator.sendBeacon) {
    // O tipo precisa ser application/json para o express.json() entender,
    // e Blob é a única forma de definir o tipo no sendBeacon.
    navigator.sendBeacon(url, new Blob([corpo], { type: 'application/json' }))
    return Promise.resolve()
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: corpo,
    keepalive: true,
  }).catch(() => {})
}

/* ─── Pedidos ────────────────────────────────────────────────── */
export function criarPedido(dados) {
  return req('/pedidos', { method: 'POST', body: dados })
}

export function buscarPedidoPublico(id) {
  return get(`/pedidos/${id}/publico`)
}

/* ─── Cupons ─────────────────────────────────────────────────── */
export function validarCupom(code) {
  return req('/cupons/validar', { method: 'POST', body: { code } })
}

export function listarCupons(token) {
  return req('/cupons', { token })
}

export function criarCupom(dados, token) {
  return req('/cupons', { method: 'POST', body: dados, token })
}

export function atualizarCupom(id, dados, token) {
  return req(`/cupons/${id}`, { method: 'PUT', body: dados, token })
}

export function excluirCupom(id, token) {
  return req(`/cupons/${id}`, { method: 'DELETE', token })
}

// Formata "98.00" → "R$ 98,00"
export function formatarPreco(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`
}
