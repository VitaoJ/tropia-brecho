// Cria um admin ou troca a senha: node scripts/create-admin.js email@exemplo.com minhasenha
//
// Trocar a senha também derruba todas as sessões abertas desse admin (sobe a
// versão do token, ver migration 010). É o que fazer se um aparelho com o
// painel aberto for perdido ou roubado.
import bcrypt from 'bcryptjs'
import { pool, query } from '../src/db.js'

const [email, senha] = process.argv.slice(2)

if (!email || !senha) {
  console.error('Uso: node scripts/create-admin.js <email> <senha>')
  process.exit(1)
}

const hash = await bcrypt.hash(senha, 10)

await query(
  `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE
     SET password_hash = $2, token_version = admins.token_version + 1`,
  [email, hash]
)

await pool.end()
console.log(`✓ Admin ${email} criado/atualizado.`)
