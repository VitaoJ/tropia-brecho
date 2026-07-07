// Cria um admin: node scripts/create-admin.js email@exemplo.com minhasenha
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
   ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
  [email, hash]
)

await pool.end()
console.log(`✓ Admin ${email} criado/atualizado.`)
