import { Router } from 'express'
const router = Router()

// GET /api/produtos — listar todos (com filtros: categoria, tamanho, gênero)
router.get('/', async (req, res) => {
  // TODO: buscar no banco com filtros
  res.json({ produtos: [] })
})

// GET /api/produtos/:id — detalhe de um produto
router.get('/:id', async (req, res) => {
  // TODO: buscar produto por ID
  res.json({ produto: null })
})

// POST /api/produtos — criar produto (admin)
router.post('/', async (req, res) => {
  // TODO: validar e salvar produto
  res.status(201).json({ mensagem: 'Produto criado' })
})

// PUT /api/produtos/:id — editar produto (admin)
router.put('/:id', async (req, res) => {
  // TODO: atualizar produto
  res.json({ mensagem: 'Produto atualizado' })
})

// DELETE /api/produtos/:id — remover produto (admin)
router.delete('/:id', async (req, res) => {
  // TODO: remover produto
  res.json({ mensagem: 'Produto removido' })
})

export default router
