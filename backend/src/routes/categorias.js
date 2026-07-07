import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// GET /api/categorias — listar categorias
router.get('/', async (_req, res) => {
  try {
    const { rows } = await query('SELECT id, name, slug FROM categories ORDER BY name')
    res.json({ categorias: rows })
  } catch (err) {
    console.error('GET /categorias:', err)
    res.status(500).json({ erro: 'Erro ao buscar categorias' })
  }
})

export default router
