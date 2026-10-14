import { Router } from 'express'
import { query, transacao } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Até 6: a faixa é um aceno para o perfil, não uma cópia dele.
const MAXIMO = 6

/**
 * Link do post sem o que vem depois do código.
 *
 * O link copiado do app vem com "?img_index=1" ou "?igsh=…"; guardado assim,
 * o mesmo post colado duas vezes viraria dois. Aceita post e reel, com ou
 * sem o "https://" (no celular é comum colar só "instagram.com/p/…").
 */
export function normalizarLinkInstagram(bruto) {
  const m = String(bruto ?? '').trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel)\/([\w-]+)/i)
  return m ? `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/` : null
}

const IMAGEM_DE_FORA = 'Suba a imagem pelo botão. Link de imagem de fora não serve: o do Instagram expira em poucos dias.'

// Imagem só do nosso Cloudinary: é a URL que vai direto para a home.
const imagemValida = (v) => v == null || v === ''
  || /^https:\/\/res\.cloudinary\.com\//.test(String(v))

// GET /api/instagram — todos, para o painel
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM instagram_posts ORDER BY posicao, created_at')
    res.json({ posts: rows })
  } catch (err) {
    console.error('GET /instagram:', err)
    res.status(500).json({ erro: 'Erro ao buscar os posts' })
  }
})

// POST /api/instagram — { url, imagem }
router.post('/', requireAdmin, async (req, res) => {
  const url = normalizarLinkInstagram(req.body.url)
  if (!url) return res.status(400).json({ erro: 'Cole o link de um post do Instagram (instagram.com/p/…)' })
  if (!imagemValida(req.body.imagem)) return res.status(400).json({ erro: IMAGEM_DE_FORA })
  try {
    const { rows: [{ n }] } = await query('SELECT COUNT(*)::int n FROM instagram_posts')
    if (n >= MAXIMO) return res.status(400).json({ erro: `A faixa mostra até ${MAXIMO} posts. Tire um antes.` })
    const { rows: [post] } = await query(
      `INSERT INTO instagram_posts (url, imagem, posicao)
       SELECT $1, $2, COALESCE(MAX(posicao), -1) + 1 FROM instagram_posts
       RETURNING *`,
      [url, req.body.imagem || null]
    )
    res.status(201).json({ post })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Esse post já está na faixa' })
    console.error('POST /instagram:', err)
    res.status(500).json({ erro: 'Erro ao adicionar o post' })
  }
})

// PUT /api/instagram/ordem — { ids: [...] } na ordem nova
router.put('/ordem', requireAdmin, async (req, res) => {
  const ids = req.body.ids
  if (!Array.isArray(ids) || ids.some(id => !UUID.test(String(id)))) {
    return res.status(400).json({ erro: 'Ordem inválida' })
  }
  try {
    await transacao(async (c) => {
      for (const [posicao, id] of ids.entries()) {
        await c.query('UPDATE instagram_posts SET posicao = $1 WHERE id = $2', [posicao, id])
      }
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /instagram/ordem:', err)
    res.status(500).json({ erro: 'Erro ao salvar a ordem' })
  }
})

// PUT /api/instagram/:id — { url?, imagem? }
router.put('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Post não encontrado' })
  const campos = {}
  if ('url' in req.body) {
    campos.url = normalizarLinkInstagram(req.body.url)
    if (!campos.url) return res.status(400).json({ erro: 'Cole o link de um post do Instagram (instagram.com/p/…)' })
  }
  if ('imagem' in req.body) {
    if (!imagemValida(req.body.imagem)) return res.status(400).json({ erro: IMAGEM_DE_FORA })
    campos.imagem = req.body.imagem || null
  }
  const chaves = Object.keys(campos)
  if (!chaves.length) return res.status(400).json({ erro: 'Nada para atualizar' })
  try {
    const { rows: [post] } = await query(
      `UPDATE instagram_posts SET ${chaves.map((k, i) => `${k} = $${i + 1}`).join(', ')}
        WHERE id = $${chaves.length + 1} RETURNING *`,
      [...chaves.map(k => campos[k]), req.params.id]
    )
    if (!post) return res.status(404).json({ erro: 'Post não encontrado' })
    res.json({ post })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Esse post já está na faixa' })
    console.error('PUT /instagram/:id:', err)
    res.status(500).json({ erro: 'Erro ao salvar o post' })
  }
})

// DELETE /api/instagram/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Post não encontrado' })
  try {
    await query('DELETE FROM instagram_posts WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /instagram/:id:', err)
    res.status(500).json({ erro: 'Erro ao remover o post' })
  }
})

export default router
