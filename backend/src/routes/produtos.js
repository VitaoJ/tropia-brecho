import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

// GET /api/produtos — listar peças disponíveis
// Filtros via query string: ?categoria=feminino&tamanho=M&genero=feminino&limite=20&pagina=1
router.get('/', async (req, res) => {
  try {
    const { categoria, tamanho, genero, condicao } = req.query
    const limite = Math.min(parseInt(req.query.limite) || 20, 100)
    const pagina = Math.max(parseInt(req.query.pagina) || 1, 1)

    // vendidas=1 inclui peças já vendidas (usado pelo painel admin)
    const filtros = req.query.vendidas === '1' ? ['TRUE'] : ['p.sold = FALSE']
    const valores = []

    if (categoria) {
      valores.push(categoria)
      filtros.push(`c.slug = $${valores.length}`)
    }
    if (tamanho) {
      valores.push(tamanho)
      filtros.push(`p.size = $${valores.length}`)
    }
    if (genero) {
      valores.push(genero)
      filtros.push(`p.gender = $${valores.length}`)
    }
    if (condicao) {
      valores.push(condicao)
      filtros.push(`p.condition = $${valores.length}`)
    }

    valores.push(limite, (pagina - 1) * limite)

    const { rows } = await query(
      `SELECT p.id, p.name, p.price, p.size, p.gender, p.condition, p.images,
              p.created_at, c.name AS categoria, c.slug AS categoria_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${filtros.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
      valores
    )

    res.json({ produtos: rows, pagina, limite })
  } catch (err) {
    console.error('GET /produtos:', err)
    res.status(500).json({ erro: 'Erro ao buscar produtos' })
  }
})

// GET /api/produtos/:id — detalhe + similares
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.name AS categoria, c.slug AS categoria_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' })
    }
    const produto = rows[0]

    // Similares: mesma categoria + gênero, não vendidos, máx. 6
    const { rows: similares } = await query(
      `SELECT id, name, price, size, images
       FROM products
       WHERE category_id = $1 AND gender = $2 AND sold = FALSE AND id != $3
       ORDER BY created_at DESC
       LIMIT 6`,
      [produto.category_id, produto.gender, produto.id]
    )

    res.json({ produto, similares })
  } catch (err) {
    console.error('GET /produtos/:id:', err)
    res.status(500).json({ erro: 'Erro ao buscar produto' })
  }
})

// POST /api/produtos — criar peça (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category_id, size, gender, condition, images } = req.body
    if (!name || !price) {
      return res.status(400).json({ erro: 'Nome e preço são obrigatórios' })
    }
    const { rows } = await query(
      `INSERT INTO products (name, description, price, category_id, size, gender, condition, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description ?? null, price, category_id ?? null, size ?? null, gender ?? null, condition ?? null, images ?? []]
    )
    res.status(201).json({ produto: rows[0] })
  } catch (err) {
    console.error('POST /produtos:', err)
    res.status(500).json({ erro: 'Erro ao criar produto' })
  }
})

// PUT /api/produtos/:id — editar peça (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category_id, size, gender, condition, images, sold } = req.body
    const { rows } = await query(
      `UPDATE products SET
         name        = COALESCE($1, name),
         description = COALESCE($2, description),
         price       = COALESCE($3, price),
         category_id = COALESCE($4, category_id),
         size        = COALESCE($5, size),
         gender      = COALESCE($6, gender),
         condition   = COALESCE($7, condition),
         images      = COALESCE($8, images),
         sold        = COALESCE($9, sold)
       WHERE id = $10
       RETURNING *`,
      [name, description, price, category_id, size, gender, condition, images, sold, req.params.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' })
    }
    res.json({ produto: rows[0] })
  } catch (err) {
    console.error('PUT /produtos/:id:', err)
    res.status(500).json({ erro: 'Erro ao atualizar produto' })
  }
})

// DELETE /api/produtos/:id — remover peça (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id])
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado' })
    }
    res.json({ mensagem: 'Produto removido' })
  } catch (err) {
    console.error('DELETE /produtos/:id:', err)
    res.status(500).json({ erro: 'Erro ao remover produto' })
  }
})

export default router
