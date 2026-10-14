// Token de admin de verdade para os scripts de teste.
//
// Os testes assinavam token para um admin inventado ("teste") — o mesmo truque
// do ataque que a migration 010 fechou. Agora o servidor exige um admin que
// exista e a versão atual do token dele, então os dois vêm do banco.
import jwt from 'jsonwebtoken'
import { pool } from '../src/db.js'

export async function tokenDeTeste() {
  const { rows } = await pool.query(
    'SELECT id, token_version FROM admins ORDER BY created_at LIMIT 1'
  )
  if (!rows[0]) throw new Error('Nenhum admin no banco: rode npm run create-admin')
  return jwt.sign(
    { id: rows[0].id, v: rows[0].token_version },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  )
}
