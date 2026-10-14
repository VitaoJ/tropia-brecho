import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Protege as rotas do painel.
 *
 * A assinatura sozinha não basta, e foi assim que isto já esteve: quem tivesse
 * o JWT_SECRET emitia token para um admin que nem existia e lia os pedidos com
 * CPF e endereço. Agora o token só vale se o admin ainda existir no banco e se
 * a versão gravada nele for a atual (ver migration 010). Uma consulta a mais
 * por requisição do painel, que é usado por uma pessoa — custo nenhum.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' })
  }

  let dados
  try {
    // Algoritmo fixo: o token não escolhe como vai ser conferido.
    dados = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' })
  }

  // Formato conferido antes do banco: um id que não é UUID faria o Postgres
  // estourar erro, e isso viraria 500 em vez de "não autorizado".
  if (!UUID.test(String(dados.id)) || !Number.isInteger(dados.v)) {
    return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' })
  }

  try {
    const { rows } = await query(
      'SELECT id, email, token_version FROM admins WHERE id = $1',
      [dados.id]
    )
    const admin = rows[0]
    if (!admin || admin.token_version !== dados.v) {
      return res.status(401).json({ erro: 'Sessão expirada. Entre de novo.' })
    }
    req.admin = { id: admin.id, email: admin.email }
    next()
  } catch (err) {
    // Banco fora não é "senha errada": 503, para o painel não tratar uma
    // queda passageira como sessão inválida.
    console.error('requireAdmin:', err.message)
    res.status(503).json({ erro: 'Não foi possível conferir a sessão agora' })
  }
}
