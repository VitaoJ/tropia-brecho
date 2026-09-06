import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import produtosRouter   from './routes/produtos.js'
import pedidosRouter    from './routes/pedidos.js'
import reservasRouter   from './routes/reservas.js'
import uploadRouter     from './routes/upload.js'
import avaliacoesRouter from './routes/avaliacoes.js'
import freteRouter      from './routes/frete.js'
import pagamentosRouter from './routes/pagamentos.js'
import authRouter       from './routes/auth.js'
import categoriasRouter from './routes/categorias.js'
import cuponsRouter     from './routes/cupons.js'

dotenv.config()

const app = express()

// Headers de segurança padrão. crossOriginResourcePolicy fica desligado
// porque o site e a API vivem em domínios diferentes (Vercel e Railway).
app.use(helmet({ crossOriginResourcePolicy: false }))

// O Railway fica atrás de proxy: sem isto o rate limit veria um IP só para
// todo mundo e bloquearia a loja inteira junto com o atacante.
app.set('trust proxy', 1)

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

app.use(express.json({ limit: '100kb' }))

// Login sem limite é senha ilimitada por script. Conta por IP e só penaliza
// quem erra: acerto não gasta tentativa.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente de novo em alguns minutos.' },
})
app.use('/api/auth/login', limiteLogin)

// Teto largo no resto da API: não atrapalha navegação normal e corta
// varredura automatizada.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Espere um instante.' },
}))

app.use('/api/produtos',    produtosRouter)
app.use('/api/pedidos',     pedidosRouter)
app.use('/api/reservas',    reservasRouter)
app.use('/api/upload',      uploadRouter)
app.use('/api/avaliacoes',  avaliacoesRouter)
app.use('/api/frete',       freteRouter)
app.use('/api/pagamentos',  pagamentosRouter)
app.use('/api/auth',        authRouter)
app.use('/api/categorias',  categoriasRouter)
app.use('/api/cupons',      cuponsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Tropia Brechó' }))

// Confirma que o banco responde, sem expor nada da conexão
app.get('/api/health/db', async (_req, res) => {
  try {
    const { pool } = await import('./db.js')
    await pool.query('SELECT 1')
    res.json({ banco: 'ok' })
  } catch (err) {
    console.error('Healthcheck do banco:', err.message)
    res.status(503).json({ banco: 'indisponível' })
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
