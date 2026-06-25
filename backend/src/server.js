import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import produtosRouter   from './routes/produtos.js'
import pedidosRouter    from './routes/pedidos.js'
import pagamentosRouter from './routes/pagamentos.js'
import authRouter       from './routes/auth.js'

dotenv.config()

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

// Rotas
app.use('/api/produtos',    produtosRouter)
app.use('/api/pedidos',     pedidosRouter)
app.use('/api/pagamentos',  pagamentosRouter)
app.use('/api/auth',        authRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Tropia Brechó' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`🛍️  Tropia API rodando na porta ${PORT}`))
