import { Router } from 'express'
import { query, transacao } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'
import { slugificar } from '../utils/texto.js'

const router = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const texto = (v) => String(v ?? '').trim()

// Quantas peças cada faixa mostra na home. O resto fica no "ver tudo".
const POR_FAIXA = 8

// Colunas que a vitrine usa, iguais às da listagem do catálogo.
const PECA = `p.id, p.name, p.price, p.original_price, p.size, p.gender, p.condition,
              p.images, p.sold, p.created_at, cat.slug AS categoria_slug`

/* ─── Público ──────────────────────────────────────────────────── */

// GET /api/colecoes/home — a página inicial: capa e seções, em ordem.
//
// Uma requisição só para a home inteira: a capa é a primeira coisa que
// aparece, e esperar várias respostas em sequência atrasaria a página.
router.get('/home', async (_req, res) => {
  try {
    const { rows: [capa] } = await query(
      `SELECT c.id, c.nome, c.slug, c.chamada, c.foto_capa, c.peca_destaque_id,
              (SELECT COUNT(*) FROM collection_products cp JOIN products p ON p.id = cp.product_id
                WHERE cp.collection_id = c.id AND p.sold = FALSE)::int AS total
         FROM collections c WHERE c.na_capa`
    )

    // A peça do cartão. Se a escolhida já foi vendida, entra a primeira
    // disponível da coleção com foto: o cartão da capa não pode levar para
    // uma peça que não se compra mais.
    let destaque = null
    if (capa) {
      const { rows: [p] } = await query(
        `SELECT p.id, p.name, p.images FROM products p
          WHERE p.sold = FALSE AND cardinality(p.images) > 0
            AND (p.id = $2 OR p.id IN (SELECT product_id FROM collection_products
                                        WHERE collection_id = $1))
          ORDER BY (p.id = $2) DESC, p.created_at DESC LIMIT 1`,
        [capa.id, capa.peca_destaque_id]
      )
      if (p) destaque = { id: p.id, nome: p.name, imagem: p.images[0] }
    }

    const { rows: secoes } = await query(
      `SELECT s.tipo, c.id AS colecao_id, c.nome, c.slug, c.chamada
         FROM home_secoes s
         LEFT JOIN collections c ON c.id = s.collection_id
        WHERE s.visivel AND (s.tipo <> 'colecao' OR NOT c.arquivada)
        ORDER BY s.posicao`
    )

    // Peças de todas as faixas numa consulta só, cortadas em POR_FAIXA.
    const ids = secoes.filter(s => s.tipo === 'colecao').map(s => s.colecao_id)
    const { rows: pecas } = ids.length ? await query(
      `SELECT * FROM (
         SELECT cp.collection_id, ${PECA},
                ROW_NUMBER() OVER (PARTITION BY cp.collection_id ORDER BY p.created_at DESC) AS n
           FROM collection_products cp JOIN products p ON p.id = cp.product_id
           LEFT JOIN categories cat ON cat.id = p.category_id
          WHERE cp.collection_id = ANY($1::uuid[]) AND p.sold = FALSE
       ) x WHERE n <= $2`,
      [ids, POR_FAIXA]
    ) : { rows: [] }

    // Posts do Instagram, só os que já têm imagem: sem ela não há o que mostrar.
    const { rows: posts } = secoes.some(s => s.tipo === 'instagram')
      ? await query(
          `SELECT url, imagem FROM instagram_posts
            WHERE imagem IS NOT NULL ORDER BY posicao, created_at`)
      : { rows: [] }

    res.json({
      capa: capa ? {
        nome: capa.nome, slug: capa.slug, chamada: capa.chamada,
        foto: capa.foto_capa, total: capa.total, destaque,
      } : null,
      secoes: secoes
        .map(s => s.tipo === 'instagram' ? { tipo: 'instagram', posts }
          : s.tipo !== 'colecao' ? { tipo: s.tipo } : {
          tipo: 'colecao', nome: s.nome, slug: s.slug, chamada: s.chamada,
          pecas: pecas.filter(p => p.collection_id === s.colecao_id)
            .map(({ collection_id, n, ...p }) => p),
        })
        // Faixa sem peça (ou sem post com imagem) não aparece: melhor não
        // ter que ter vazia.
        .filter(s => (s.tipo !== 'colecao' || s.pecas.length > 0)
                  && (s.tipo !== 'instagram' || s.posts.length > 0)),
    })
  } catch (err) {
    console.error('GET /colecoes/home:', err)
    res.status(500).json({ erro: 'Erro ao montar a página inicial' })
  }
})

/* ─── Painel ───────────────────────────────────────────────────── */

// GET /api/colecoes — todas, com as peças, e a ordem da página inicial.
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows: colecoes } = await query(
      `SELECT c.*,
              COALESCE(ARRAY_AGG(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), '{}') AS pecas
         FROM collections c
         LEFT JOIN collection_products cp ON cp.collection_id = c.id
        GROUP BY c.id
        ORDER BY c.arquivada, c.created_at`
    )
    const { rows: secoes } = await query(
      `SELECT s.id, s.tipo, s.collection_id, s.visivel FROM home_secoes s ORDER BY s.posicao`
    )
    res.json({ colecoes, secoes })
  } catch (err) {
    console.error('GET /colecoes:', err)
    res.status(500).json({ erro: 'Erro ao buscar coleções' })
  }
})

function validar(corpo, { parcial = false } = {}) {
  const erros = []
  if (!parcial || 'nome' in corpo) {
    const nome = texto(corpo.nome)
    if (nome.length < 2) erros.push('Dê um nome à coleção')
    if (nome.length > 60) erros.push('O nome passou de 60 caracteres')
    if (!slugificar(nome)) erros.push('O nome precisa ter letras ou números')
  }
  if ('chamada' in corpo && texto(corpo.chamada).length > 140) {
    erros.push('A chamada passou de 140 caracteres')
  }
  if (corpo.peca_destaque_id && !UUID.test(texto(corpo.peca_destaque_id))) {
    erros.push('Peça em destaque inválida')
  }
  if ('pecas' in corpo) {
    if (!Array.isArray(corpo.pecas) || corpo.pecas.some(id => !UUID.test(String(id)))) {
      erros.push('Lista de peças inválida')
    }
  }
  return erros
}

// Slug livre: "vintage", "vintage-2"... O nome pode repetir, a URL não.
async function slugLivre(cliente, nome, ignorarId = null) {
  const base = slugificar(nome)
  const { rows } = await cliente.query(
    `SELECT slug FROM collections WHERE (slug = $1 OR slug LIKE $1 || '-%') AND id IS DISTINCT FROM $2`,
    [base, ignorarId]
  )
  const usados = new Set(rows.map(r => r.slug))
  if (!usados.has(base)) return base
  let n = 2
  while (usados.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

async function trocarPecas(cliente, colecaoId, pecas) {
  await cliente.query('DELETE FROM collection_products WHERE collection_id = $1', [colecaoId])
  const unicas = [...new Set(pecas.map(String))]
  if (unicas.length) {
    await cliente.query(
      `INSERT INTO collection_products (collection_id, product_id)
       SELECT $1, id FROM products WHERE id = ANY($2::uuid[])`,
      [colecaoId, unicas]
    )
  }
}

// POST /api/colecoes — criar. Entra na home no fim da lista, visível.
router.post('/', requireAdmin, async (req, res) => {
  const erros = validar(req.body)
  if (erros.length) return res.status(400).json({ erro: erros.join('. ') })
  try {
    const colecao = await transacao(async (c) => {
      const slug = await slugLivre(c, req.body.nome)
      const { rows: [nova] } = await c.query(
        `INSERT INTO collections (nome, slug, chamada, foto_capa, peca_destaque_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [texto(req.body.nome), slug, texto(req.body.chamada) || null,
         texto(req.body.foto_capa) || null, texto(req.body.peca_destaque_id) || null]
      )
      await trocarPecas(c, nova.id, req.body.pecas ?? [])
      await c.query(
        `INSERT INTO home_secoes (tipo, collection_id, posicao)
         SELECT 'colecao', $1, COALESCE(MAX(posicao), -1) + 1 FROM home_secoes`,
        [nova.id]
      )
      return nova
    })
    res.status(201).json({ colecao })
  } catch (err) {
    console.error('POST /colecoes:', err)
    res.status(500).json({ erro: 'Erro ao criar a coleção' })
  }
})

// PUT /api/colecoes/home/ordem — a página inicial de cima para baixo.
// Recebe todas as seções na ordem nova, com visível ou não.
router.put('/home/ordem', requireAdmin, async (req, res) => {
  const lista = req.body.secoes
  if (!Array.isArray(lista) || lista.some(s => !UUID.test(String(s?.id)))) {
    return res.status(400).json({ erro: 'Ordem inválida' })
  }
  try {
    await transacao(async (c) => {
      for (const [posicao, s] of lista.entries()) {
        await c.query('UPDATE home_secoes SET posicao = $1, visivel = $2 WHERE id = $3',
          [posicao, s.visivel !== false, s.id])
      }
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /colecoes/home/ordem:', err)
    res.status(500).json({ erro: 'Erro ao salvar a ordem' })
  }
})

// PUT /api/colecoes/:id — editar. Só mexe no que vier no corpo.
router.put('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Coleção não encontrada' })
  const erros = validar(req.body, { parcial: true })
  if (erros.length) return res.status(400).json({ erro: erros.join('. ') })
  try {
    const resultado = await transacao(async (c) => {
      const { rows: [atual] } = await c.query('SELECT * FROM collections WHERE id = $1', [req.params.id])
      if (!atual) return { status: 404, erro: 'Coleção não encontrada' }

      // A capa precisa de foto: tirar a foto da coleção da capa deixaria a
      // home com um fundo vazio.
      if (atual.na_capa && 'foto_capa' in req.body && !texto(req.body.foto_capa)) {
        return { status: 400, erro: 'Esta coleção está na capa: ela precisa de uma foto de fundo' }
      }

      const campos = {}
      if ('nome' in req.body) {
        campos.nome = texto(req.body.nome)
        // A URL só muda se o nome mudar de verdade, para não quebrar link
        // que alguém já compartilhou.
        if (slugificar(campos.nome) !== slugificar(atual.nome)) {
          campos.slug = await slugLivre(c, campos.nome, atual.id)
        }
      }
      if ('chamada' in req.body) campos.chamada = texto(req.body.chamada) || null
      if ('foto_capa' in req.body) campos.foto_capa = texto(req.body.foto_capa) || null
      if ('peca_destaque_id' in req.body) campos.peca_destaque_id = texto(req.body.peca_destaque_id) || null

      const chaves = Object.keys(campos)
      if (chaves.length) {
        await c.query(
          `UPDATE collections SET ${chaves.map((k, i) => `${k} = $${i + 1}`).join(', ')}
            WHERE id = $${chaves.length + 1}`,
          [...chaves.map(k => campos[k]), atual.id]
        )
      }
      if ('pecas' in req.body) await trocarPecas(c, atual.id, req.body.pecas)
      return { status: 200 }
    })
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro })
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /colecoes/:id:', err)
    res.status(500).json({ erro: 'Erro ao salvar a coleção' })
  }
})

// POST /api/colecoes/:id/capa — leva a coleção para a capa da home.
router.post('/:id/capa', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Coleção não encontrada' })
  try {
    const resultado = await transacao(async (c) => {
      const { rows: [col] } = await c.query('SELECT * FROM collections WHERE id = $1', [req.params.id])
      if (!col) return { status: 404, erro: 'Coleção não encontrada' }
      if (col.arquivada) return { status: 400, erro: 'Desarquive a coleção antes de levá-la para a capa' }
      if (!col.foto_capa) return { status: 400, erro: 'Coloque uma foto de fundo antes de levar para a capa' }
      // Tira a atual antes: o índice único não deixa duas capas nem por um instante.
      await c.query('UPDATE collections SET na_capa = FALSE WHERE na_capa AND id <> $1', [col.id])
      await c.query('UPDATE collections SET na_capa = TRUE WHERE id = $1', [col.id])
      return { status: 200 }
    })
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro })
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /colecoes/:id/capa:', err)
    res.status(500).json({ erro: 'Erro ao trocar a capa' })
  }
})

// POST /api/colecoes/:id/arquivar — { arquivada: true|false }
router.post('/:id/arquivar', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Coleção não encontrada' })
  try {
    const arquivar = req.body.arquivada !== false
    const { rows: [col] } = await query('SELECT na_capa FROM collections WHERE id = $1', [req.params.id])
    if (!col) return res.status(404).json({ erro: 'Coleção não encontrada' })
    if (arquivar && col.na_capa) {
      return res.status(400).json({ erro: 'Esta coleção está na capa. Leve outra para a capa antes de arquivar.' })
    }
    await query('UPDATE collections SET arquivada = $1 WHERE id = $2', [arquivar, req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /colecoes/:id/arquivar:', err)
    res.status(500).json({ erro: 'Erro ao arquivar' })
  }
})

// DELETE /api/colecoes/:id — some de vez. As peças continuam no estoque.
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Coleção não encontrada' })
  try {
    const { rows: [col] } = await query('SELECT na_capa FROM collections WHERE id = $1', [req.params.id])
    if (!col) return res.status(404).json({ erro: 'Coleção não encontrada' })
    if (col.na_capa) {
      return res.status(400).json({ erro: 'Esta coleção está na capa. Leve outra para a capa antes de excluir.' })
    }
    await query('DELETE FROM collections WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /colecoes/:id:', err)
    res.status(500).json({ erro: 'Erro ao excluir a coleção' })
  }
})

export default router
