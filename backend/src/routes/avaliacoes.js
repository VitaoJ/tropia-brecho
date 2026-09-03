import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const texto = (v) => String(v ?? '').trim()

// O @ é guardado sem o arroba, e a tela coloca de volta — assim quem digita
// "@ana" e quem digita "ana" acabam iguais.
const arroba = (v) => texto(v).replace(/^@+/, '') || null

function validar(corpo, { parcial = false } = {}) {
  const erros = []
  const autor = texto(corpo.author)
  const conteudo = texto(corpo.text)

  if (!parcial || 'author' in corpo) {
    if (autor.length < 2) erros.push('Informe o nome de quem avaliou')
  }
  if (!parcial || 'text' in corpo) {
    if (conteudo.length < 10) erros.push('A avaliação está curta demais')
    if (conteudo.length > 600) erros.push('A avaliação passou de 600 caracteres')
  }
  if (corpo.rating != null && corpo.rating !== '') {
    const n = Number(corpo.rating)
    if (!Number.isInteger(n) || n < 1 || n > 5) erros.push('A nota vai de 1 a 5')
  }
  if (corpo.product_id && !UUID.test(texto(corpo.product_id))) {
    erros.push('Peça inválida')
  }
  return erros
}

const paraBanco = (c) => ({
  author: texto(c.author),
  handle: arroba(c.handle),
  text: texto(c.text),
  rating: c.rating === '' || c.rating == null ? null : Number(c.rating),
  photo: texto(c.photo) || null,
  product_id: texto(c.product_id) || null,
  published: c.published === undefined ? true : Boolean(c.published),
  position: Number.isFinite(Number(c.position)) ? Number(c.position) : 0,
})

// Formato que a home espera, já com a peça junto quando existir
const paraTela = (r) => ({
  id: r.id,
  autor: r.author,
  handle: r.handle,
  texto: r.text,
  nota: r.rating,
  foto: r.photo,
  publicada: r.published,
  posicao: r.position,
  criado_em: r.created_at,
  peca: r.product_id
    ? { id: r.product_id, nome: r.product_name, imagem: r.product_image }
    : null,
})

const SELECT = `
  SELECT r.*, p.name AS product_name, p.images[1] AS product_image
    FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id`

// GET /api/avaliacoes — o que aparece na home. Só as publicadas.
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      `${SELECT} WHERE r.published ORDER BY r.position, r.created_at DESC LIMIT 24`)
    res.json({ avaliacoes: rows.map(paraTela) })
  } catch (err) {
    console.error('GET /avaliacoes:', err)
    res.status(500).json({ erro: 'Erro ao buscar avaliações' })
  }
})

// GET /api/avaliacoes/todas — inclui as despublicadas (painel)
router.get('/todas', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(`${SELECT} ORDER BY r.position, r.created_at DESC`)
    res.json({ avaliacoes: rows.map(paraTela) })
  } catch (err) {
    console.error('GET /avaliacoes/todas:', err)
    res.status(500).json({ erro: 'Erro ao buscar avaliações' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const erros = validar(req.body)
  if (erros.length) return res.status(400).json({ erro: erros[0], erros })

  try {
    const d = paraBanco(req.body)
    const { rows } = await query(
      `INSERT INTO reviews (author, handle, text, rating, photo, product_id, published, position)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [d.author, d.handle, d.text, d.rating, d.photo, d.product_id, d.published, d.position]
    )
    const { rows: completa } = await query(`${SELECT} WHERE r.id = $1`, [rows[0].id])
    res.status(201).json({ avaliacao: paraTela(completa[0]) })
  } catch (err) {
    console.error('POST /avaliacoes:', err)
    res.status(500).json({ erro: 'Erro ao criar avaliação' })
  }
})

// PUT — só mexe no que veio no corpo, para o botão de publicar/despublicar
// não precisar reenviar a avaliação inteira.
router.put('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Avaliação não encontrada' })
  const erros = validar(req.body, { parcial: true })
  if (erros.length) return res.status(400).json({ erro: erros[0], erros })

  const CAMPOS = ['author', 'handle', 'text', 'rating', 'photo', 'product_id', 'published', 'position']
  const enviados = CAMPOS.filter(c => c in req.body)
  if (!enviados.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar' })

  try {
    const d = paraBanco({ ...req.body })
    const sets = enviados.map((c, i) => `${c} = $${i + 1}`)
    const valores = enviados.map(c => d[c])
    valores.push(req.params.id)

    const { rowCount } = await query(
      `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${valores.length}`, valores)
    if (!rowCount) return res.status(404).json({ erro: 'Avaliação não encontrada' })

    const { rows } = await query(`${SELECT} WHERE r.id = $1`, [req.params.id])
    res.json({ avaliacao: paraTela(rows[0]) })
  } catch (err) {
    console.error('PUT /avaliacoes/:id:', err)
    res.status(500).json({ erro: 'Erro ao atualizar avaliação' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Avaliação não encontrada' })
  try {
    const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ erro: 'Avaliação não encontrada' })
    res.json({ mensagem: 'Avaliação removida' })
  } catch (err) {
    console.error('DELETE /avaliacoes/:id:', err)
    res.status(500).json({ erro: 'Erro ao remover avaliação' })
  }
})

export default router
