// Teste de ponta a ponta do fluxo de pedidos.
//
//   1. suba a API:  npm run dev
//   2. em outro terminal:  npm run teste:pedidos
//
// Cria pedidos de verdade e apaga tudo no fim (seção 6). Como o .env aponta
// para o banco de produção, se este script for interrompido no meio ele deixa
// pedidos de teste no painel — confira antes de sair.
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
dotenv.config()

const API = 'http://localhost:3001/api'
const token = jwt.sign({ id: 'teste', email: 'teste@tropia' }, process.env.JWT_SECRET, { expiresIn: '1h' })
const admin = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const json = { 'Content-Type': 'application/json' }

let passou = 0, falhou = 0
function checar(nome, condicao, extra = '') {
  if (condicao) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome} ${extra}`) }
}

const post = (rota, corpo, headers = json) =>
  fetch(API + rota, { method: 'POST', headers, body: JSON.stringify(corpo) })
    .then(async r => ({ status: r.status, corpo: await r.json() }))

// ── preparo ────────────────────────────────────────────────────────
const { produtos } = await fetch(`${API}/produtos?limite=4`).then(r => r.json())
const disponiveis = produtos.filter(p => !p.sold)
if (disponiveis.length < 2) { console.error('Precisa de 2 peças disponíveis'); process.exit(1) }
const [a, b] = disponiveis
const precoA = Number(a.price), precoB = Number(b.price)
console.log(`Peças: "${a.name}" R$${precoA} + "${b.name}" R$${precoB}\n`)

await post('/cupons', { code: 'TESTE20', discount_percent: 20 }, admin)

const cliente = { nome: 'Vitor Freitas', email: `teste${Date.now()}@tropia.com`, cpf: '52998224725', telefone: '11987654321' }
const endereco = { cep: '01310-100', rua: 'Av Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' }
// Mesma sessão de checkout para todos os pedidos: sem isso a reserva criada
// pelo primeiro pedido bloquearia os seguintes, que é justamente o esperado.
const sessao = randomUUID()

// ── 1. validação ───────────────────────────────────────────────────
console.log('1. Validação de entrada')
let r = await post('/pedidos', {})
checar('pedido vazio é recusado', r.status === 400)
r = await post('/pedidos', { cliente: { ...cliente, cpf: '11111111111' }, endereco, itens: [a.id] })
checar('CPF com dígito errado é recusado', r.status === 400 && r.corpo.erro === 'CPF inválido', JSON.stringify(r.corpo))
r = await post('/pedidos', { cliente: { ...cliente, nome: 'Vitor' }, endereco, itens: [a.id] })
checar('nome sem sobrenome é recusado', r.status === 400)
r = await post('/pedidos', { cliente, endereco: { ...endereco, estado: 'XX' }, itens: [a.id] })
checar('UF inexistente é recusada', r.status === 400)
r = await post('/pedidos', { cliente, endereco, sessao, itens: ['nao-e-uuid'] })
checar('id de peça inválido é recusado', r.status === 400)
r = await post('/pedidos', { cliente, endereco, sessao, itens: [] })
checar('carrinho vazio é recusado', r.status === 400)
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id], forma_pagamento: 'boleto' })
checar('forma de pagamento desconhecida é recusada', r.status === 400)

// ── 2. cálculo no servidor ─────────────────────────────────────────
console.log('\n2. Conta fechada no servidor')
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id, b.id], forma_pagamento: 'pix', total_esperado: 0.01 })
checar('total forjado pelo navegador é recusado', r.status === 409, JSON.stringify(r.corpo))

const sub = precoA + precoB
const esperaFrete = sub >= 150 ? 0 : 14.90
const esperaPix = Math.round(sub * 0.95 * 100) / 100 + esperaFrete
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id, b.id], forma_pagamento: 'pix' })
checar('pedido no PIX criado', r.status === 201, JSON.stringify(r.corpo))
const p = r.corpo.pedido
checar(`subtotal = ${sub}`, p?.subtotal === sub, `veio ${p?.subtotal}`)
checar(`frete = ${esperaFrete}`, p?.frete === esperaFrete, `veio ${p?.frete}`)
checar(`total PIX = ${esperaPix.toFixed(2)}`, Math.abs(p?.total - esperaPix) < 0.01, `veio ${p?.total}`)
checar('peça duplicada não vira duas', p?.itens?.length === 2)

// desconto do PIX não vale no cartão
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id], forma_pagamento: 'credit_card' })
const cartao = r.corpo.pedido
checar('cartão não ganha desconto do PIX', cartao?.total === Math.round((precoA + (precoA >= 150 ? 0 : 14.90)) * 100) / 100, `veio ${cartao?.total}`)

// cupom + pix acumulam
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id, b.id], forma_pagamento: 'pix', cupom: 'teste20' })
const comCupom = r.corpo.pedido
const cupomEsperado = Math.round(sub * 0.8 * 100) / 100
const totalCupom = Math.round(cupomEsperado * 0.95 * 100) / 100 + (cupomEsperado >= 150 ? 0 : 14.90)
checar('cupom aceito em minúsculas', comCupom?.cupom === 'TESTE20')
checar('cupom e PIX se acumulam', Math.abs(comCupom?.total - totalCupom) < 0.01, `veio ${comCupom?.total}, esperado ${totalCupom}`)
r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id], cupom: 'NAOEXISTE' })
checar('cupom inexistente é recusado', r.status === 400 && r.corpo.campo === 'cupom')

// ── 3. consulta pública ────────────────────────────────────────────
console.log('\n3. Consulta pública do pedido')
const pub = await fetch(`${API}/pedidos/${p.id}/publico`).then(async r => ({ status: r.status, corpo: await r.json() }))
checar('página de sucesso enxerga o pedido', pub.status === 200)
checar('não vaza CPF nem endereço', !JSON.stringify(pub.corpo).match(/52998224725|Paulista/), JSON.stringify(pub.corpo).slice(0, 200))
checar('tem número curto para o cliente citar', /^[0-9A-F]{8}$/.test(pub.corpo.pedido?.numero))

// ── 4. painel ──────────────────────────────────────────────────────
console.log('\n4. Painel')
let lista = await fetch(`${API}/pedidos`).then(async r => ({ status: r.status }))
checar('listagem exige login', lista.status === 401)
lista = await fetch(`${API}/pedidos`, { headers: admin }).then(r => r.json())
checar('admin lista pedidos', lista.pedidos?.length >= 3, `veio ${lista.pedidos?.length}`)
checar('listagem conta as peças', lista.pedidos[0]?.pecas > 0)
const det = await fetch(`${API}/pedidos/${p.id}`, { headers: admin }).then(r => r.json())
checar('detalhe traz endereço para etiqueta', det.pedido?.endereco?.cidade === 'São Paulo')
checar('detalhe traz CPF para a nota', det.pedido?.cliente?.cpf === '52998224725')

// ── 5. status ──────────────────────────────────────────────────────
console.log('\n5. Andar do status')
const mudar = (id, status) => fetch(`${API}/pedidos/${id}/status`, { method: 'PUT', headers: admin, body: JSON.stringify({ status }) })
  .then(async r => ({ status: r.status, corpo: await r.json() }))

r = await mudar(p.id, 'delivered')
checar('não pula de pendente para entregue', r.status === 400, JSON.stringify(r.corpo))
r = await mudar(p.id, 'paid')
checar('pendente vira pago', r.status === 200, JSON.stringify(r.corpo))

const vendida = await fetch(`${API}/produtos/${a.id}`).then(r => r.json())
checar('pagar dá baixa na peça', vendida.produto?.sold === true, JSON.stringify(vendida.produto?.sold))

r = await post('/pedidos', { cliente, endereco, sessao, itens: [a.id] })
checar('peça vendida não entra em pedido novo', r.status === 409, JSON.stringify(r.corpo))
checar('diz qual peça saiu', !!r.corpo.indisponiveis?.length)

r = await mudar(p.id, 'pending')
checar('status não anda para trás', r.status === 400)
r = await mudar(p.id, 'shipped')
checar('pago vira enviado', r.status === 200)
r = await mudar(p.id, 'delivered')
checar('enviado vira entregue', r.status === 200)
r = await mudar(p.id, 'cancelled')
checar('entregue não muda mais', r.status === 400)

// cancelamento devolve peça e uso do cupom
const usosAntes = await fetch(`${API}/cupons`, { headers: admin }).then(r => r.json())
  .then(d => d.cupons.find(c => c.code === 'TESTE20').uses)
await mudar(comCupom.id, 'paid')
const usosPagos = await fetch(`${API}/cupons`, { headers: admin }).then(r => r.json())
  .then(d => d.cupons.find(c => c.code === 'TESTE20').uses)
checar('pagar conta o uso do cupom', usosPagos === usosAntes + 1, `${usosAntes} → ${usosPagos}`)
await mudar(comCupom.id, 'cancelled')
const usosCancelado = await fetch(`${API}/cupons`, { headers: admin }).then(r => r.json())
  .then(d => d.cupons.find(c => c.code === 'TESTE20').uses)
checar('cancelar devolve o uso do cupom', usosCancelado === usosAntes, `${usosPagos} → ${usosCancelado}`)
const devolvida = await fetch(`${API}/produtos/${b.id}`).then(r => r.json())
checar('cancelar devolve a peça para a vitrine', devolvida.produto?.sold === false)

// ── limpeza ────────────────────────────────────────────────────────
// O .env aponta para o banco de produção: o teste tem que sair sem deixar
// rastro, senão vira pedido fantasma no painel.
console.log('\n6. Limpeza')
const { pool } = await import('../src/db.js')
const c = await pool.connect()
try {
  await c.query('BEGIN')
  const { rows: cli } = await c.query("SELECT id FROM customers WHERE email LIKE 'teste%@tropia.com'")
  const ids = cli.map(r => r.id)
  await c.query('DELETE FROM orders    WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM addresses WHERE customer_id = ANY($1::uuid[])', [ids])
  await c.query('DELETE FROM customers WHERE id          = ANY($1::uuid[])', [ids])
  await c.query("DELETE FROM coupons   WHERE code = 'TESTE20'")
  // Devolve para a vitrine qualquer peça que o teste tenha dado baixa
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
    'SELECT (SELECT COUNT(*) FROM orders)::int p, (SELECT COUNT(*) FROM products WHERE sold)::int v')
  checar('banco volta ao estado anterior', n.p === 0 && n.v === 0, JSON.stringify(n))
} catch (e) { await c.query('ROLLBACK'); checar('limpeza', false, e.message) }
finally { c.release(); await pool.end() }

console.log(`\n${passou} passaram, ${falhou} falharam`)
process.exit(falhou ? 1 : 0)
