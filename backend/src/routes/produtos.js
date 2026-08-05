import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

// Reserva vencida não conta: a peça volta a ficar livre sozinha, sem rotina
// de limpeza. Quem pergunta é que ignora o prazo passado.
const RESERVADA = '(p.reserved_until IS NOT NULL AND p.reserved_until > NOW())'

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
      `SELECT p.id, p.name, p.description, p.price, p.original_price, p.size,
              p.gender, p.condition, p.images, p.sold, p.category_id, p.created_at,
              ${RESERVADA} AS reservada,
              c.name AS categoria, c.slug AS categoria_slug
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

// GET /api/produtos/filtros — valores que existem no estoque disponível.
// Precisa vir antes de /:id, senão "filtros" seria lido como um id.
router.get('/filtros', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         ARRAY(SELECT DISTINCT size   FROM products WHERE sold = FALSE AND size   IS NOT NULL ORDER BY size)   AS tamanhos,
         ARRAY(SELECT DISTINCT gender FROM products WHERE sold = FALSE AND gender IS NOT NULL ORDER BY gender) AS generos`
    )
    res.json(rows[0])
  } catch (err) {
    console.error('GET /produtos/filtros:', err)
    res.status(500).json({ erro: 'Erro ao buscar filtros' })
  }
})

// GET /api/produtos/:id — detalhe + similares
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, ${RESERVADA} AS reservada,
              c.name AS categoria, c.slug AS categoria_slug
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
      `SELECT id, name, price, original_price, size, images
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

const CAMPOS = [
  'name', 'description', 'price', 'original_price',
  'category_id', 'size', 'gender', 'condition', 'images', 'sold',
]

// original_price é o preço "de" — só faz sentido acima do preço atual
function validarDesconto(original_price, price) {
  if (original_price == null) return null
  if (price != null && Number(original_price) <= Number(price)) {
    return 'O preço anterior precisa ser maior que o preço atual'
  }
  return null
}

// POST /api/produtos — criar peça (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, price, original_price, category_id, size, gender, condition, images } = req.body
    if (!name || !price) {
      return res.status(400).json({ erro: 'Nome e preço são obrigatórios' })
    }
    const invalido = validarDesconto(original_price, price)
    if (invalido) return res.status(400).json({ erro: invalido })

    const { rows } = await query(
      `INSERT INTO products (name, description, price, original_price, category_id, size, gender, condition, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, description ?? null, price, original_price ?? null, category_id ?? null,
       size ?? null, gender ?? null, condition ?? null, images ?? []]
    )
    res.status(201).json({ produto: rows[0] })
  } catch (err) {
    console.error('POST /produtos:', err)
    res.status(500).json({ erro: 'Erro ao criar produto' })
  }
})

// PUT /api/produtos/:id — editar peça (admin)
// Só atualiza os campos presentes no corpo, para que enviar null
// signifique "limpar" (necessário para remover um desconto).
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const enviados = CAMPOS.filter(c => c in req.body)
    if (enviados.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' })
    }

    if ('original_price' in req.body) {
      const precoAtual = 'price' in req.body
        ? req.body.price
        : (await query('SELECT price FROM products WHERE id = $1', [req.params.id])).rows[0]?.price
      const invalido = validarDesconto(req.body.original_price, precoAtual)
      if (invalido) return res.status(400).json({ erro: invalido })
    }

    const sets = enviados.map((campo, i) => `${campo} = $${i + 1}`)
    const valores = enviados.map(campo => req.body[campo])
    valores.push(req.params.id)

    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${valores.length} RETURNING *`,
      valores
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
