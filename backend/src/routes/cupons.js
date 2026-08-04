import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

const normalizar = (codigo) => String(codigo ?? '').trim().toUpperCase()

// Motivo pelo qual um cupom não pode ser usado, ou null se estiver válido
function motivoInvalido(cupom) {
  if (!cupom) return 'Cupom não encontrado'
  if (!cupom.active) return 'Cupom desativado'
  if (cupom.valid_until && new Date(cupom.valid_until) < new Date().setHours(0, 0, 0, 0)) {
    return 'Cupom expirado'
  }
  if (cupom.max_uses != null && cupom.uses >= cupom.max_uses) {
    return 'Cupom esgotado'
  }
  return null
}

// POST /api/cupons/validar — checagem pública, usada no checkout
router.post('/validar', async (req, res) => {
  try {
    const code = normalizar(req.body.code)
    if (!code) return res.status(400).json({ erro: 'Informe o código do cupom' })

    const { rows } = await query('SELECT * FROM coupons WHERE code = $1', [code])
    const erro = motivoInvalido(rows[0])
    if (erro) return res.status(404).json({ erro })

    res.json({ cupom: { code: rows[0].code, discount_percent: rows[0].discount_percent } })
  } catch (err) {
    console.error('POST /cupons/validar:', err)
    res.status(500).json({ erro: 'Erro ao validar cupom' })
  }
})

// GET /api/cupons — listar (admin)
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM coupons ORDER BY created_at DESC')
    res.json({ cupons: rows })
  } catch (err) {
    console.error('GET /cupons:', err)
    res.status(500).json({ erro: 'Erro ao buscar cupons' })
  }
})

// POST /api/cupons — criar (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const code = normalizar(req.body.code)
    const desconto = Number(req.body.discount_percent)

    if (!code) return res.status(400).json({ erro: 'Informe o código do cupom' })
    if (!Number.isInteger(desconto) || desconto < 1 || desconto > 90) {
      return res.status(400).json({ erro: 'O desconto deve ser um número inteiro entre 1 e 90' })
    }

    const { rows } = await query(
      `INSERT INTO coupons (code, discount_percent, valid_until, max_uses)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, desconto, req.body.valid_until || null, req.body.max_uses || null]
    )
    res.status(201).json({ cupom: rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um cupom com esse código' })
    }
    console.error('POST /cupons:', err)
    res.status(500).json({ erro: 'Erro ao criar cupom' })
  }
})

// PUT /api/cupons/:id — editar / ativar / desativar (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const campos = ['discount_percent', 'active', 'valid_until', 'max_uses']
    const enviados = campos.filter(c => c in req.body)
    if (enviados.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' })
    }

    const sets = enviados.map((campo, i) => `${campo} = $${i + 1}`)
    const valores = enviados.map(campo => req.body[campo] === '' ? null : req.body[campo])
    valores.push(req.params.id)

    const { rows } = await query(
      `UPDATE coupons SET ${sets.join(', ')} WHERE id = $${valores.length} RETURNING *`,
      valores
    )
    if (rows.length === 0) return res.status(404).json({ erro: 'Cupom não encontrado' })
    res.json({ cupom: rows[0] })
  } catch (err) {
    console.error('PUT /cupons/:id:', err)
    res.status(500).json({ erro: 'Erro ao atualizar cupom' })
  }
})

// DELETE /api/cupons/:id — remover (admin)
// Cupom já usado é desativado em vez de apagado, para não sumir do histórico.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT uses FROM coupons WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ erro: 'Cupom não encontrado' })

    if (rows[0].uses > 0) {
      await query('UPDATE coupons SET active = FALSE WHERE id = $1', [req.params.id])
      return res.json({ mensagem: 'Cupom já foi usado em pedidos, então foi desativado em vez de excluído' })
    }

    await query('DELETE FROM coupons WHERE id = $1', [req.params.id])
    res.json({ mensagem: 'Cupom removido' })
  } catch (err) {
    console.error('DELETE /cupons/:id:', err)
    res.status(500).json({ erro: 'Erro ao remover cupom' })
  }
})

export default router
