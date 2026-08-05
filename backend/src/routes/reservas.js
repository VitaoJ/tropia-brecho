import { Router } from 'express'
import { transacao } from '../db.js'
import {
  RESERVA_MINUTOS, reservadaPorOutro, daquiAMinutos,
} from '../utils/reserva.js'

const router = Router()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/reservas — segura as peças do carrinho por RESERVA_MINUTOS.
// Chamado ao entrar no checkout e a cada etapa concluída: avançar é sinal de
// que a pessoa está mesmo comprando, então o prazo recomeça. Quem só deixou a
// aba aberta não avança etapa e perde a reserva na hora certa.
router.post('/', async (req, res) => {
  const sessao = String(req.body.sessao ?? '')
  const itens = [...new Set((Array.isArray(req.body.itens) ? req.body.itens : []).map(String))]

  if (!UUID.test(sessao)) return res.status(400).json({ erro: 'Sessão inválida' })
  if (!itens.length) return res.status(400).json({ erro: 'Nenhuma peça para reservar' })
  if (itens.some(id => !UUID.test(id))) return res.status(400).json({ erro: 'Peça inválida' })

  try {
    const resultado = await transacao(async (cliente) => {
      const { rows: pecas } = await cliente.query(
        `SELECT id, name, sold, reserved_until, reserved_by
           FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [itens]
      )

      const indisponiveis = pecas
        .filter(p => p.sold || reservadaPorOutro(p, sessao))
        .map(p => ({
          id: p.id,
          nome: p.name,
          motivo: p.sold ? 'vendida' : 'reservada',
        }))

      const sumiram = itens.filter(id => !pecas.some(p => p.id === id))
      indisponiveis.push(...sumiram.map(id => ({ id, nome: null, motivo: 'removida' })))

      const livres = pecas.filter(p => !p.sold && !reservadaPorOutro(p, sessao)).map(p => p.id)
      const expiraEm = daquiAMinutos(RESERVA_MINUTOS)

      if (livres.length) {
        await cliente.query(
          `UPDATE products SET reserved_until = $1, reserved_by = $2 WHERE id = ANY($3::uuid[])`,
          [expiraEm, sessao, livres]
        )
      }

      return {
        // Se alguma peça caiu, o checkout precisa parar e avisar antes de cobrar
        status: indisponiveis.length ? 409 : 200,
        corpo: {
          reservadas: livres,
          indisponiveis,
          expira_em: expiraEm.toISOString(),
          segundos: RESERVA_MINUTOS * 60,
          ...(indisponiveis.length && {
            erro: indisponiveis.length === 1 && indisponiveis[0].nome
              ? `A peça "${indisponiveis[0].nome}" não está mais disponível`
              : 'Algumas peças não estão mais disponíveis',
          }),
        },
      }
    })

    res.status(resultado.status).json(resultado.corpo)
  } catch (err) {
    console.error('POST /reservas:', err)
    res.status(500).json({ erro: 'Não foi possível reservar as peças' })
  }
})

// POST /api/reservas/liberar — devolve as peças que esta sessão segurava.
// É POST, e não DELETE, porque o navegador só consegue avisar na saída com
// navigator.sendBeacon(), que manda POST. Chega sem resposta esperada, então
// nunca falha para o usuário: no pior caso a reserva expira sozinha.
router.post('/liberar', async (req, res) => {
  const sessao = String(req.body?.sessao ?? '')
  if (!UUID.test(sessao)) return res.status(400).json({ erro: 'Sessão inválida' })

  try {
    // Só solta o que ainda não virou pedido: peça vendida não volta à vitrine.
    const { rowCount } = await transacao(cliente => cliente.query(
      `UPDATE products SET reserved_until = NULL, reserved_by = NULL
        WHERE reserved_by = $1 AND sold = FALSE`,
      [sessao]
    ))
    res.json({ liberadas: rowCount })
  } catch (err) {
    console.error('POST /reservas/liberar:', err)
    res.status(500).json({ erro: 'Erro ao liberar reserva' })
  }
})

export default router
