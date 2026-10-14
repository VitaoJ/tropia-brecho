// Teste da sessão do painel: só entra quem é admin de verdade, agora.
//
//   1. suba a API:  npm run dev
//   2. em outro terminal:  npm run teste:auth
//
// Cria um admin descartável, ataca a API com tokens forjados e apaga o admin
// no fim. O .env aponta para o banco de produção: se o script for
// interrompido, confira se sobrou algum admin "teste-auth-…@tropia.test".
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { randomUUID, randomBytes } from 'crypto'
import { pool } from '../src/db.js'
dotenv.config()

const API = 'http://localhost:3001/api'
const SEGREDO = process.env.JWT_SECRET

let passou = 0, falhou = 0
function checar(nome, condicao, extra = '') {
  if (condicao) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome} ${extra}`) }
}

const chamar = (rota, token) => fetch(API + rota, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
}).then(r => r.status)

const entrar = (email, senha) => fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, senha }),
}).then(async r => ({ status: r.status, corpo: await r.json() }))

// O teste de verdade: cada token abaixo tem que ser barrado tanto na rota
// que diz quem é o admin quanto numa que devolve dado de cliente.
async function barrado(nome, token) {
  const [me, pedidos] = await Promise.all([chamar('/auth/me', token), chamar('/pedidos', token)])
  checar(nome, me === 401 && pedidos === 401, `(me ${me}, pedidos ${pedidos})`)
}

const email = `teste-auth-${Date.now()}@tropia.test`
const senha = randomBytes(12).toString('hex')
const { rows: [admin] } = await pool.query(
  'INSERT INTO admins (email, password_hash) VALUES ($1, $2) RETURNING id, token_version',
  [email, await bcrypt.hash(senha, 10)]
)

try {
  // ── 1. login ─────────────────────────────────────────────────────
  console.log('\n1. Login')
  checar('sem token → 401', await chamar('/auth/me') === 401)
  checar('senha errada → 401', (await entrar(email, 'errada')).status === 401)

  const login = await entrar(email, senha)
  checar('senha certa → 200', login.status === 200, `(${login.status})`)
  const token = login.corpo.token
  const dados = jwt.decode(token)
  checar('token vale 24h', dados.exp - dados.iat === 86400, `(${(dados.exp - dados.iat) / 3600}h)`)
  checar('token leva a versão', dados.v === admin.token_version)

  const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
  checar('/me devolve o admin do banco', me.admin?.email === email)
  checar('token válido lê pedidos', await chamar('/pedidos', token) === 200)

  // ── 2. tokens forjados com o segredo certo ───────────────────────
  // Era isto que passava: assinatura válida bastava.
  console.log('\n2. Forjados com o JWT_SECRET certo')
  await barrado('admin que não existe',
    jwt.sign({ id: randomUUID(), v: 0 }, SEGREDO, { expiresIn: '1h' }))
  await barrado('formato antigo, sem versão (os tokens de 7 dias em circulação)',
    jwt.sign({ id: admin.id, email }, SEGREDO, { expiresIn: '7d' }))
  await barrado('id que não é UUID (antes viraria 500)',
    jwt.sign({ id: 'teste', v: 0 }, SEGREDO, { expiresIn: '1h' }))
  await barrado('versão errada',
    jwt.sign({ id: admin.id, v: admin.token_version + 1 }, SEGREDO, { expiresIn: '1h' }))
  await barrado('expirado',
    jwt.sign({ id: admin.id, v: admin.token_version, exp: Math.floor(Date.now() / 1000) - 60 }, SEGREDO))
  await barrado('outro algoritmo (HS512)',
    jwt.sign({ id: admin.id, v: admin.token_version }, SEGREDO, { algorithm: 'HS512', expiresIn: '1h' }))

  // ── 3. tokens sem o segredo ──────────────────────────────────────
  console.log('\n3. Sem o segredo')
  await barrado('assinado com outro segredo',
    jwt.sign({ id: admin.id, v: admin.token_version }, 'outro-segredo', { expiresIn: '1h' }))
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  await barrado('alg=none', `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: admin.id, v: 0 })}.`)

  // ── 4. revogação ─────────────────────────────────────────────────
  console.log('\n4. Revogação')
  await pool.query('UPDATE admins SET token_version = token_version + 1 WHERE id = $1', [admin.id])
  await barrado('token de antes da troca de senha', token)

  const depois = (await entrar(email, senha)).corpo.token
  checar('login novo funciona depois da troca', await chamar('/auth/me', depois) === 200)

  await pool.query('DELETE FROM admins WHERE id = $1', [admin.id])
  await barrado('token de admin apagado', depois)
} finally {
  await pool.query('DELETE FROM admins WHERE email = $1', [email])
  await pool.end()
}

console.log(`\n${passou} ok, ${falhou} falha(s)`)
process.exit(falhou ? 1 : 0)
