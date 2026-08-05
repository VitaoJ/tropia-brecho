// Teste de ponta a ponta da reserva de peça.
//
//   1. suba a API:  npm run dev
//   2. em outro terminal:  npm run teste:reservas
//
// Limpa o que cria no fim. Como o .env aponta para o banco de produção, se for
// interrompido no meio pode deixar peça reservada — some sozinha em 10 min.
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import { pool } from '../src/db.js'
dotenv.config()

const API = 'http://localhost:3001/api'
const token = jwt.sign({ id: 'teste', email: 'teste@tropia' }, process.env.JWT_SECRET, { expiresIn: '1h' })
const admin = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const json = { 'Content-Type': 'application/json' }

let passou = 0, falhou = 0
const checar = (nome, ok, extra = '') => {
  if (ok) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome} ${extra}`) }
}
const post = (rota, corpo, headers = json) =>
  fetch(API + rota, { method: 'POST', headers, body: JSON.stringify(corpo) })
    .then(async r => ({ status: r.status, corpo: await r.json() }))

const anaLuiza = randomUUID()   // duas pessoas comprando ao mesmo tempo
const bruno = randomUUID()

const { produtos } = await fetch(`${API}/produtos?limite=4`).then(r => r.json())
const [a, b] = produtos.filter(p => !p.sold)
console.log(`Disputando "${a.name}"\n`)

const cliente = { nome: 'Ana Luiza Prado', email: `teste${Date.now()}@tropia.com`, cpf: '52998224725', telefone: '11987654321' }
const endereco = { cep: '01310-100', rua: 'Av Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' }

// ── 1. quem chega primeiro ─────────────────────────────────────────
console.log('1. Duas pessoas, uma peça')
let r = await post('/reservas', { sessao: anaLuiza, itens: [a.id] })
checar('Ana reserva a peça', r.status === 200 && r.corpo.reservadas.length === 1, JSON.stringify(r.corpo))
checar('devolve quando expira', !!r.corpo.expira_em && r.corpo.segundos === 600)

r = await post('/reservas', { sessao: bruno, itens: [a.id] })
checar('Bruno não consegue reservar', r.status === 409)
checar('motivo é "reservada", não "vendida"', r.corpo.indisponiveis?.[0]?.motivo === 'reservada', JSON.stringify(r.corpo.indisponiveis))
checar('a mensagem diz o nome da peça', r.corpo.erro?.includes(a.name))

r = await post('/reservas', { sessao: anaLuiza, itens: [a.id] })
checar('Ana renova a própria reserva', r.status === 200 && r.corpo.reservadas.length === 1)

r = await post('/pedidos', { cliente, endereco, itens: [a.id], sessao: bruno })
checar('Bruno não fecha pedido da peça reservada', r.status === 409, JSON.stringify(r.corpo))
checar('explica que alguém está comprando', /outra pessoa/.test(r.corpo.erro ?? ''), r.corpo.erro)

// ── 2. o site mostra a reserva ─────────────────────────────────────
console.log('\n2. Vitrine')
let peca = await fetch(`${API}/produtos/${a.id}`).then(r => r.json())
checar('detalhe da peça diz que está reservada', peca.produto?.reservada === true)
let lista = await fetch(`${API}/produtos?limite=20`).then(r => r.json())
checar('peça reservada continua na vitrine', lista.produtos.some(p => p.id === a.id))
checar('listagem marca a reserva', lista.produtos.find(p => p.id === a.id)?.reservada === true)

// ── 3. sair do checkout ────────────────────────────────────────────
console.log('\n3. Sair do checkout devolve a peça')
r = await post('/reservas/liberar', { sessao: anaLuiza })
checar('liberar devolve a peça', r.status === 200 && r.corpo.liberadas === 1, JSON.stringify(r.corpo))
peca = await fetch(`${API}/produtos/${a.id}`).then(r => r.json())
checar('peça não está mais reservada', peca.produto?.reservada === false)
r = await post('/reservas', { sessao: bruno, itens: [a.id] })
checar('agora Bruno consegue', r.status === 200)

// ── 4. abandono sem aviso ──────────────────────────────────────────
// O caso que o "liberar" não cobre: fechou o app, ficou sem sinal, bateria
// acabou. Ninguém avisa nada — só o prazo resolve.
console.log('\n4. Abandono sem aviso: o prazo resolve')
await pool.query("UPDATE products SET reserved_until = NOW() - INTERVAL '1 minute' WHERE id = $1", [a.id])
peca = await fetch(`${API}/produtos/${a.id}`).then(r => r.json())
checar('reserva vencida não conta como reserva', peca.produto?.reservada === false)
r = await post('/reservas', { sessao: anaLuiza, itens: [a.id] })
checar('outra pessoa pega a peça abandonada', r.status === 200, JSON.stringify(r.corpo))

// ── 5. pedido criado segura mais tempo ─────────────────────────────
console.log('\n5. Pedido criado segura pelo tempo do pagamento')
r = await post('/pedidos', { cliente, endereco, itens: [a.id], sessao: anaLuiza, forma_pagamento: 'pix' })
checar('Ana fecha o pedido', r.status === 201, JSON.stringify(r.corpo))
const pedido = r.corpo.pedido
const minutos = (new Date(pedido.reserva_ate) - Date.now()) / 60000
checar('reserva estende para ~30 min do pagamento', minutos > 25 && minutos <= 30, `${minutos.toFixed(1)} min`)

r = await post('/reservas', { sessao: bruno, itens: [a.id] })
checar('ninguém tira a peça de um pedido em pagamento', r.status === 409)

// ── 6. fim de vida da reserva ──────────────────────────────────────
console.log('\n6. A reserva morre junto com o pedido')
const mudar = (id, status) => fetch(`${API}/pedidos/${id}/status`, { method: 'PUT', headers: admin, body: JSON.stringify({ status }) })
  .then(async r => ({ status: r.status, corpo: await r.json() }))

await mudar(pedido.id, 'cancelled')
let bd = await pool.query('SELECT sold, reserved_until FROM products WHERE id = $1', [a.id])
checar('cancelar solta a reserva na hora', bd.rows[0].reserved_until === null, JSON.stringify(bd.rows[0]))
checar('e devolve a peça para a vitrine', bd.rows[0].sold === false)

r = await post('/pedidos', { cliente, endereco, itens: [b.id], sessao: bruno })
await mudar(r.corpo.pedido.id, 'paid')
bd = await pool.query('SELECT sold, reserved_until FROM products WHERE id = $1', [b.id])
checar('pagar limpa a reserva', bd.rows[0].reserved_until === null)
checar('e dá baixa na peça', bd.rows[0].sold === true)

// ── 7. entrada inválida ────────────────────────────────────────────
console.log('\n7. Entrada inválida')
r = await post('/reservas', { sessao: 'nao-e-uuid', itens: [a.id] })
checar('sessão inválida é recusada', r.status === 400)
r = await post('/reservas', { sessao: anaLuiza, itens: [] })
checar('reserva sem peça é recusada', r.status === 400)
r = await post('/reservas', { sessao: anaLuiza, itens: [randomUUID()] })
checar('peça inexistente vira "removida"', r.status === 409 && r.corpo.indisponiveis[0].motivo === 'removida')

// ── limpeza ────────────────────────────────────────────────────────
console.log('\n8. Limpeza')
const c = await pool.connect()
try {
  await c.query('BEGIN')
  const { rows: cli } = await c.query("SELECT id FROM customers WHERE email LIKE 'teste%@tropia.com'")
  const ids = cli.map(r => r.id)
  await c.query('DELETE FROM orders    WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM addresses WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM customers WHERE id          = ANY($1::uuid[])', [ids])
  // Solta toda peça que não esteja num pedido de verdade (pago em diante), e
  // não só as que este teste usou: execução anterior morta no meio também
  // deixa peça presa, e ela precisa voltar para a vitrine.
  await c.query(`UPDATE products SET sold = FALSE, reserved_until = NULL, reserved_by = NULL
                  WHERE id NOT IN (SELECT oi.product_id FROM order_items oi
                                     JOIN orders o ON o.id = oi.order_id
                                    WHERE o.status IN ('paid','shipped','delivered')
                                      AND oi.product_id IS NOT NULL)`)
  await c.query('COMMIT')
  const { rows: [n] } = await c.query(
    `SELECT (SELECT COUNT(*) FROM orders)::int p,
            (SELECT COUNT(*) FROM products WHERE sold)::int v,
            (SELECT COUNT(*) FROM products WHERE reserved_until IS NOT NULL)::int r`)
  checar('banco volta ao estado anterior', n.p === 0 && n.v === 0 && n.r === 0, JSON.stringify(n))
} catch (e) { await c.query('ROLLBACK'); checar('limpeza', false, e.message) }
finally { c.release(); await pool.end() }

console.log(`\n${passou} passaram, ${falhou} falharam`)
process.exit(falhou ? 1 : 0)
