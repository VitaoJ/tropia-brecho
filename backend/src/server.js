import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import produtosRouter   from './routes/produtos.js'
import pedidosRouter    from './routes/pedidos.js'
import pagamentosRouter from './routes/pagamentos.js'
import authRouter       from './routes/auth.js'
import categoriasRouter from './routes/categorias.js'
import cuponsRouter     from './routes/cupons.js'

dotenv.config()

const app = express()

// A Vercel gera uma URL nova a cada preview, então além do domínio de
// produção aceitamos os previews do próprio projeto e o ambiente local.
const ORIGENS_FIXAS = (process.env.FRONTEND_URL ?? '')
  .split(',').map(o => o.trim()).filter(Boolean)

const PREVIEW_VERCEL = /^https:\/\/tropia-brecho[a-z0-9-]*\.vercel\.app$/
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

app.use(cors({
  origin(origin, callback) {
    // Sem origin: curl, healthcheck do Railway, webhook do Mercado Pago
    if (!origin) return callback(null, true)
    const liberado = ORIGENS_FIXAS.includes(origin)
      || PREVIEW_VERCEL.test(origin)
      || LOCAL.test(origin)
    callback(liberado ? null : new Error(`Origem não autorizada: ${origin}`), liberado)
  },
}))

app.use(express.json())

app.use('/api/produtos',    produtosRouter)
app.use('/api/pedidos',     pedidosRouter)
app.use('/api/pagamentos',  pagamentosRouter)
app.use('/api/auth',        authRouter)
app.use('/api/categorias',  categoriasRouter)
app.use('/api/cupons',      cuponsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Tropia Brechó' }))

// TEMPORÁRIO — diagnóstico da conexão com o banco. Remover depois do deploy.
// Mostra host e erro, nunca usuário ou senha.
app.get('/api/health/db', async (_req, res) => {
  const bruta = process.env.DATABASE_URL
  let alvo = 'DATABASE_URL ausente'
  if (bruta) {
    try {
      const u = new URL(bruta)
      alvo = `${u.hostname}:${u.port || 5432}${u.pathname}`
    } catch {
      alvo = 'DATABASE_URL presente, mas não é uma URL válida'
    }
  }
  try {
    const { pool } = await import('./db.js')
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM products')
    res.json({ conectado: true, alvo, produtos: rows[0].total })
  } catch (err) {
    res.status(500).json({ conectado: false, alvo, erro: err.message, codigo: err.code })
  }
})

app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }))

// Sem isto, um erro de CORS viraria uma resposta HTML de stack trace
app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.message?.startsWith('Origem não autorizada') ? 403 : 500
  res.status(status).json({ erro: status === 403 ? 'Origem não autorizada' : 'Erro interno' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🛍️  Tropia API rodando na porta ${PORT}`))
