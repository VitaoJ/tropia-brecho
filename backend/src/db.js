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

/**
 * Roda `fn` dentro de uma transação e devolve a conexão ao pool no fim,
 * dando erro ou não. Sem o `release` no finally, um erro vaza conexão e
 * depois de algumas o servidor trava esperando uma livre.
 */
export async function transacao(fn) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await fn(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    cliente.release()
  }
}
