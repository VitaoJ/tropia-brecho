import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

// POST /api/auth/login — login do admin
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body
    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' })
    }

    const { rows } = await query(
      'SELECT id, email, password_hash, token_version FROM admins WHERE email = $1',
      [email]
    )
    if (rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' })
    }

    const admin = rows[0]
    const senhaCorreta = await bcrypt.compare(senha, admin.password_hash)
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' })
    }

    // `v` é a versão do token (migration 010): o middleware compara com a do
    // banco, e subir a do banco derruba este token.
    //
    // 24h em vez dos 7 dias de antes. A revogação cobre o roubo percebido; a
    // validade curta cobre o que ninguém percebeu.
    const token = jwt.sign(
      { id: admin.id, v: admin.token_version },
      process.env.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    )

    res.json({ token, admin: { id: admin.id, email: admin.email } })
  } catch (err) {
    console.error('POST /auth/login:', err)
    res.status(500).json({ erro: 'Erro ao fazer login' })
  }
})

// GET /api/auth/me — verificar token
router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin.id, email: req.admin.email } })
})

export default router
