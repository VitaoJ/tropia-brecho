import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const url = process.env.DATABASE_URL ?? ''

// Postgres local e a rede interna do Railway falam sem TLS; o proxy público
// do Railway exige TLS, com certificado autoassinado.
const semTLS = url.includes('localhost')
  || url.includes('127.0.0.1')
  || url.includes('.railway.internal')

export const pool = new Pool({
  connectionString: url,
  ssl: semTLS ? false : { rejectUnauthorized: false },
})

// Sem isto, uma queda de conexão derruba o processo inteiro sem explicação
pool.on('error', (err) => console.error('Erro no pool do Postgres:', err.message))

export const query = (text, params) => pool.query(text, params)
