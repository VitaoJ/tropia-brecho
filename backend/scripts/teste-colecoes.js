// Teste das coleções, da ordem da home e das tags.
//
//   1. suba a API:  npm run dev
//   2. em outro terminal:  npm run teste:colecoes
//
// O .env aponta para o banco de produção. O teste cria coleções descartáveis
// ("teste-col-…"), troca a capa por alguns segundos e devolve tudo no fim —
// inclusive se quebrar no meio (bloco finally). Rodar com a loja no ar faz a
// capa piscar para a coleção de teste durante esses segundos.
import dotenv from 'dotenv'
import { pool } from '../src/db.js'
import { tokenDeTeste } from './tokenDeTeste.js'
dotenv.config()

const API = 'http://localhost:3001/api'
const token = await tokenDeTeste()
const admin = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

let passou = 0, falhou = 0
function checar(nome, condicao, extra = '') {
  if (condicao) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome} ${extra}`) }
}

const chamar = (metodo, rota, corpo, headers = admin) =>
  fetch(API + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined })
    .then(async r => ({ status: r.status, corpo: await r.json().catch(() => ({})) }))
const home = () => chamar('GET', '/colecoes/home', null, {}).then(r => r.corpo)

// ── preparo: o estado para devolver no fim ─────────────────────────
const { rows: [capaOriginal] } = await pool.query('SELECT id FROM collections WHERE na_capa')
const { rows: ordemOriginal } = await pool.query('SELECT id, posicao, visivel FROM home_secoes')
const { rows: disponiveis } = await pool.query(
  `SELECT id, name, tags FROM products WHERE sold = FALSE AND cardinality(images) > 0
    ORDER BY created_at DESC LIMIT 2`)
if (disponiveis.length < 2) { console.error('Precisa de 2 peças disponíveis com foto'); process.exit(1) }
const [a, b] = disponiveis
const nome = `teste-col-${Date.now()}`
const FOTO = 'https://res.cloudinary.com/mvsuquav/image/upload/v1788724160/tropia/site/hero-vintage.jpg'

try {
  // ── 1. criar ─────────────────────────────────────────────────────
  console.log('\n1. Criar')
  checar('sem token → 401', (await chamar('POST', '/colecoes', { nome }, { 'Content-Type': 'application/json' })).status === 401)
  checar('nome vazio → 400', (await chamar('POST', '/colecoes', { nome: ' ' })).status === 400)
  checar('peça inválida → 400', (await chamar('POST', '/colecoes', { nome, pecas: ['x'] })).status === 400)

  let r = await chamar('POST', '/colecoes', { nome, chamada: 'chamada de teste', pecas: [a.id, b.id, a.id] })
  checar('cria com 201', r.status === 201, JSON.stringify(r.corpo))
  const col = r.corpo.colecao
  checar('slug vem do nome', col?.slug === nome)
  r = await chamar('POST', '/colecoes', { nome })
  checar('mesmo nome ganha outra URL', r.corpo.colecao?.slug === `${nome}-2`, r.corpo.colecao?.slug)
  const col2 = r.corpo.colecao

  let h = await home()
  const faixa = h.secoes.find(s => s.slug === col.slug)
  checar('coleção nova aparece na home', !!faixa)
  checar('peça repetida entra uma vez só', faixa?.pecas.length === 2, `${faixa?.pecas.length}`)
  checar('coleção sem peça não aparece', !h.secoes.some(s => s.slug === col2.slug))

  r = await chamar('GET', `/produtos?colecao=${col.slug}`, null, {})
  checar('catálogo filtra pela coleção', r.corpo.produtos?.length === 2)
  checar('e manda o nome para o título', r.corpo.colecao?.nome === nome)

  // ── 2. capa ──────────────────────────────────────────────────────
  console.log('\n2. Capa')
  r = await chamar('POST', `/colecoes/${col.id}/capa`)
  checar('sem foto não vai para a capa', r.status === 400)
  await chamar('PUT', `/colecoes/${col.id}`, { foto_capa: FOTO, peca_destaque_id: b.id })
  r = await chamar('POST', `/colecoes/${col.id}/capa`)
  checar('com foto vai', r.status === 200, JSON.stringify(r.corpo))
  h = await home()
  checar('home mostra a capa nova', h.capa?.slug === col.slug)
  checar('cartão mostra a peça escolhida', h.capa?.destaque?.id === b.id)
  const { rows: [{ n }] } = await pool.query('SELECT COUNT(*)::int n FROM collections WHERE na_capa')
  checar('uma capa só', n === 1, `${n}`)

  await pool.query('UPDATE products SET sold = TRUE WHERE id = $1', [b.id])
  h = await home()
  checar('peça do cartão vendida → cartão troca sozinho', h.capa?.destaque?.id === a.id, h.capa?.destaque?.nome)
  checar('e ela sai da faixa', !h.secoes.find(s => s.slug === col.slug)?.pecas.some(p => p.id === b.id))
  await pool.query('UPDATE products SET sold = FALSE WHERE id = $1', [b.id])

  checar('capa não pode tirar a foto', (await chamar('PUT', `/colecoes/${col.id}`, { foto_capa: '' })).status === 400)
  checar('capa não pode ser arquivada', (await chamar('POST', `/colecoes/${col.id}/arquivar`, { arquivada: true })).status === 400)
  checar('capa não pode ser excluída', (await chamar('DELETE', `/colecoes/${col.id}`)).status === 400)

  // ── 3. ordem e arquivo ───────────────────────────────────────────
  console.log('\n3. Ordem da home')
  const { corpo: { secoes } } = await chamar('GET', '/colecoes')
  const minha = secoes.find(s => s.collection_id === col.id)
  const nova = [minha, ...secoes.filter(s => s.id !== minha.id)]
  await chamar('PUT', '/colecoes/home/ordem', { secoes: nova.map(s => ({ id: s.id, visivel: s.visivel })) })
  h = await home()
  checar('subir para o topo vale na home', h.secoes[0]?.slug === col.slug, h.secoes[0]?.tipo)
  await chamar('PUT', '/colecoes/home/ordem', { secoes: nova.map(s => ({ id: s.id, visivel: s.id !== minha.id })) })
  checar('esconder tira da home', !(await home()).secoes.some(s => s.slug === col.slug))
  checar('ordem inválida → 400', (await chamar('PUT', '/colecoes/home/ordem', { secoes: [{ id: 'x' }] })).status === 400)

  await chamar('POST', `/colecoes/${capaOriginal.id}/capa`)
  await chamar('PUT', '/colecoes/home/ordem', { secoes: nova.map(s => ({ id: s.id, visivel: true })) })
  r = await chamar('POST', `/colecoes/${col.id}/arquivar`, { arquivada: true })
  checar('fora da capa, arquiva', r.status === 200)
  checar('arquivada some da home mesmo visível', !(await home()).secoes.some(s => s.slug === col.slug))
  r = await chamar('POST', `/colecoes/${col.id}/capa`)
  checar('arquivada não vai para a capa', r.status === 400)

  // ── 4. tags ──────────────────────────────────────────────────────
  console.log('\n4. Tags')
  r = await chamar('PUT', `/produtos/${a.id}`, { tags: ['Anos 90', 'anos  90', ' #Customizada ', 'x'.repeat(30), 'vestido, Floral'] })
  checar('normaliza: minúscula, sem # nem repetida, sem gigante, vírgula separa',
    JSON.stringify(r.corpo.produto?.tags) === JSON.stringify(['anos 90', 'customizada', 'vestido', 'floral']), JSON.stringify(r.corpo.produto?.tags))
  r = await chamar('GET', `/produtos?tag=${encodeURIComponent('Anos 90')}`, null, {})
  checar('catálogo acha pela tag, em qualquer caixa', r.corpo.produtos?.some(p => p.id === a.id))
  r = await chamar('GET', `/produtos/${a.id}`, null, {})
  checar('página da peça recebe as tags', r.corpo.produto?.tags?.includes('customizada'))

  // ── 5. instagram ─────────────────────────────────────────────────
  console.log('\n5. Instagram')
  checar('post sem imagem não aparece na home', !(await home()).secoes.some(s => s.tipo === 'instagram'))
  r = await chamar('POST', '/instagram', { url: 'https://www.instagram.com/p/TESTEcol123/?img_index=1' })
  checar('link do app vira link limpo', r.corpo.post?.url === 'https://www.instagram.com/p/TESTEcol123/', r.corpo.post?.url)
  const post = r.corpo.post
  checar('mesmo post, com outro sufixo → 409',
    (await chamar('POST', '/instagram', { url: 'https://instagram.com/p/TESTEcol123/?igsh=x' })).status === 409)
  checar('mesmo post, colado sem https → 409',
    (await chamar('POST', '/instagram', { url: 'instagram.com/p/TESTEcol123' })).status === 409)
  checar('link que não é post → 400', (await chamar('POST', '/instagram', { url: 'https://example.com/p/x' })).status === 400)
  checar('imagem do CDN do Instagram → 400',
    (await chamar('PUT', `/instagram/${post.id}`, { imagem: 'https://scontent.cdninstagram.com/v/x.jpg' })).status === 400)
  await chamar('PUT', `/instagram/${post.id}`, { imagem: FOTO })
  h = await home()
  const ig = h.secoes.find(s => s.tipo === 'instagram')
  checar('com imagem, aparece na home', ig?.posts.some(p => p.url === post.url))
  checar('e só os que têm imagem', ig?.posts.every(p => p.imagem))
} finally {
  // ── limpeza: tudo como estava ──────────────────────────────────────
  console.log('\n6. Limpeza')
  await pool.query("DELETE FROM instagram_posts WHERE url LIKE '%/TESTEcol%'")
  await pool.query('UPDATE products SET sold = FALSE WHERE id = ANY($1::uuid[])', [[a.id, b.id]])
  await pool.query('UPDATE products SET tags = $1 WHERE id = $2', [a.tags, a.id])
  await pool.query('UPDATE collections SET na_capa = FALSE WHERE na_capa AND id <> $1', [capaOriginal.id])
  await pool.query('UPDATE collections SET na_capa = TRUE WHERE id = $1', [capaOriginal.id])
  await pool.query("DELETE FROM collections WHERE nome LIKE 'teste-col-%'")
  for (const s of ordemOriginal) {
    await pool.query('UPDATE home_secoes SET posicao = $1, visivel = $2 WHERE id = $3', [s.posicao, s.visivel, s.id])
  }
  const { rows: [sobra] } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM collections WHERE nome LIKE 'teste-col-%')::int AS colecoes,
            (SELECT id FROM collections WHERE na_capa) = $1 AS capa_de_volta`, [capaOriginal.id])
  checar('nada sobrou e a capa voltou', sobra.colecoes === 0 && sobra.capa_de_volta, JSON.stringify(sobra))
  await pool.end()
}

console.log(`\n${passou} passaram, ${falhou} falharam`)
process.exit(falhou ? 1 : 0)
