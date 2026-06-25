import { Router } from 'express'
const router = Router()

// POST /api/pagamentos/criar — criar preferência no Mercado Pago
router.post('/criar', async (req, res) => {
  // TODO: integrar Mercado Pago SDK
  res.json({ init_point: '' })
})

// POST /api/pagamentos/webhook — receber notificação do MP
router.post('/webhook', async (req, res) => {
  // TODO: processar notificação e atualizar status do pedido
  res.sendStatus(200)
})

export default router
