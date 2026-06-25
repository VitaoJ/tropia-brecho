import { Router } from 'express'
const router = Router()

// POST /api/auth/login — login do admin
router.post('/login', async (req, res) => {
  // TODO: verificar email/senha e retornar JWT
  res.json({ token: '' })
})

// GET /api/auth/me — verificar token
router.get('/me', async (req, res) => {
  res.json({ admin: null })
})

export default router
