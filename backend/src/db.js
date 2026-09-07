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
  // A rede corta conexão parada. `keepAlive` manda o TCP dar sinal de vida, e
  // o timeout curto faz o pool fechar a conexão antes que a rede a derrube —
  // é melhor descartar uma conexão ociosa do que descobrir que ela morreu na
  // hora de gravar um pedido.
  keepAlive: true,
  idleTimeoutMillis: 30_000,
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

  // Enquanto a conexão está emprestada, o pool tira dela o próprio ouvinte de
  // erro (pg-pool `_acquireClient`) e só devolve no `release`. Se a rede cair
  // nesse intervalo, o 'error' do cliente fica órfão e o Node derruba a API
  // inteira — não é hipótese, foi assim que o servidor caiu. Este ouvinte
  // existe só para o erro não ficar sem dono: quem trata é o catch abaixo.
  const aoCair = (err) => console.error('Conexão caiu no meio da transação:', err.message)
  cliente.on('error', aoCair)

  try {
    await cliente.query('BEGIN')
    const resultado = await fn(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    // Sai antes do release, que é quando o pool repõe o ouvinte dele.
    cliente.removeListener('error', aoCair)
    cliente.release()
  }
}
