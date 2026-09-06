import { Router } from 'express'
import { query } from '../db.js'
import { cotar, freteConfigurado } from '../utils/melhorEnvio.js'

const router = Router()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/frete/config — o checkout pergunta antes de mostrar a seção
router.get('/config', (_req, res) => res.json({ configurado: freteConfigurado() }))

// POST /api/frete/cotar — preços e prazos para o carrinho e o CEP informados
router.post('/cotar', async (req, res) => {
  const cep = String(req.body.cep ?? '').replace(/\D/g, '')
  const itens = [...new Set((Array.isArray(req.body.itens) ? req.body.itens : []).map(String))]

  if (cep.length !== 8) return res.status(400).json({ erro: 'CEP inválido' })
  if (!itens.length) return res.status(400).json({ erro: 'Nenhuma peça para calcular' })
  if (itens.some(id => !UUID.test(id))) return res.status(400).json({ erro: 'Peça inválida' })

  try {
    // Preço e medidas vêm do banco, nunca do navegador: senão dava para
    // forjar uma peça leve e barata e receber um frete que não existe.
    const { rows: pecas } = await query(
      `SELECT p.id, p.price, p.weight_kg, p.width_cm, p.height_cm, p.length_cm,
              c.slug AS categoria_slug
         FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ANY($1::uuid[])`,
      [itens]
    )
    if (pecas.length !== itens.length) {
      return res.status(404).json({ erro: 'Alguma peça do carrinho não existe mais' })
    }

    const { opcoes, estimado, recusados } = await cotar(pecas, cep)
    if (!opcoes.length) {
      return res.status(502).json({
        erro: 'Nenhuma transportadora atende esse CEP agora',
        recusados,
      })
    }
    res.json({ opcoes, estimado })
  } catch (err) {
    // Não logar o corpo: a requisição carrega o token no header
    console.error('POST /frete/cotar:', err.message)
    res.status(err.status ?? 500).json({ erro: err.message })
  }
})

export default router
