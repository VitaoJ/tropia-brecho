import { Router } from 'express'
const router = Router()

// GET /api/pedidos — listar pedidos (admin)
router.get('/', async (req, res) => {
  res.json({ pedidos: [] })
})

// GET /api/pedidos/:id — detalhe do pedido
router.get('/:id', async (req, res) => {
  res.json({ pedido: null })
})

// POST /api/pedidos — criar pedido
router.post('/', async (req, res) => {
  res.status(201).json({ mensagem: 'Pedido criado' })
})

// PUT /api/pedidos/:id/status — atualizar status (admin)
router.put('/:id/status', async (req, res) => {
  res.json({ mensagem: 'Status atualizado' })
})

export default router
