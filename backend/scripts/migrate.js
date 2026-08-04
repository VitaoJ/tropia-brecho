// Roda as migrations pendentes na ordem: node scripts/migrate.js
// Cada arquivo aplicado fica registrado em schema_migrations e não roda de novo.
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '../../database/migrations')

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   VARCHAR(200) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
  )
`)

const { rows } = await pool.query('SELECT filename FROM schema_migrations')
const aplicadas = new Set(rows.map(r => r.filename))

const arquivos = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
const pendentes = arquivos.filter(f => !aplicadas.has(f))

if (pendentes.length === 0) {
  console.log('Nenhuma migration pendente.')
} else {
  for (const arquivo of pendentes) {
    const sql = readFileSync(join(migrationsDir, arquivo), 'utf8')
    console.log(`→ Rodando ${arquivo}...`)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [arquivo])
      await client.query('COMMIT')
      console.log(`✓ ${arquivo} aplicada`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`✗ ${arquivo} falhou — nada foi alterado:`, err.message)
      process.exitCode = 1
      break
    } finally {
      client.release()
    }
  }
}

await pool.end()
