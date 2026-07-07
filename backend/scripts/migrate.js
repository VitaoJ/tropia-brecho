// Roda as migrations SQL na ordem: node scripts/migrate.js
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../../database/migrations')

const arquivos = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

for (const arquivo of arquivos) {
  const sql = readFileSync(join(migrationsDir, arquivo), 'utf8')
  console.log(`→ Rodando ${arquivo}...`)
  await pool.query(sql)
  console.log(`✓ ${arquivo} aplicada`)
}

await pool.end()
console.log('Migrations concluídas.')
