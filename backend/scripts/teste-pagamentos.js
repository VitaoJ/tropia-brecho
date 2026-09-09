// Teste do webhook de pagamento — a porta pela qual um pedido vira "pago".
//
//   1. suba a API com um segredo de teste:
//        MP_WEBHOOK_SECRET=segredo_de_teste npm run dev
//   2. em outro terminal:  npm run teste:pagamentos
//
// Não precisa de conta no Mercado Pago: o que se testa aqui é se a porta está
// trancada. Quem tenta entrar sem assinatura, com assinatura errada ou com
// assinatura velha tem que levar 401 — senão qualquer um que descubra a URL
// marca pedido como pago.
import crypto from 'crypto'
import dotenv from 'dotenv'
import { pool } from '../src/db.js'
import { meioConfere, valorConfere, statusDoPedidoPara } from '../src/utils/mercadoPago.js'
dotenv.config()

const API = 'http://localhost:3001/api'
const SEGREDO = process.env.MP_WEBHOOK_SECRET

if (!SEGREDO) {
  console.error('Rode a API e este teste com MP_WEBHOOK_SECRET definido.')
  process.exit(1)
}

let passou = 0, falhou = 0
const checar = (nome, ok, extra = '') => {
  if (ok) { passou++; console.log(`  ok   ${nome}`) }
  else { falhou++; console.log(`  FALHA ${nome} ${extra}`) }
}

// Mesmo texto assinado que o SDK confere: id;request-id;ts, nesta ordem.
const assinar = (dataId, requestId, ts, segredo = SEGREDO) => {
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`
  return crypto.createHmac('sha256', segredo).update(manifesto).digest('hex')
}

const bater = (dataId, { ts, hash, requestId = 'req-teste-1', semAssinatura = false } = {}) => {
  const cabecalhos = { 'Content-Type': 'application/json', 'x-request-id': requestId }
  if (!semAssinatura) cabecalhos['x-signature'] = `ts=${ts},v1=${hash}`
  return fetch(`${API}/pagamentos/webhook?type=payment&data.id=${dataId}`, {
    method: 'POST', headers: cabecalhos,
    body: JSON.stringify({ action: 'payment.updated', data: { id: String(dataId) } }),
  }).then(r => r.status)
}

// Em MILISSEGUNDOS. O `ts` do cabeçalho do Mercado Pago é comparado com
// Date.now(), não com segundos desde a época — mandar em segundos faz toda
// notificação parecer ter 55 anos e ser recusada como replay.
const agora = () => Date.now()
const ID = '1234567890'

console.log('1. Quem não prova quem é, não entra')

let s = await bater(ID, { semAssinatura: true })
checar('sem cabeçalho de assinatura é recusado', s === 401, `veio ${s}`)

s = await bater(ID, { ts: agora(), hash: 'f'.repeat(64) })
checar('assinatura inventada é recusada', s === 401, `veio ${s}`)

s = await bater(ID, { ts: agora(), hash: assinar(ID, 'req-teste-1', agora(), 'outro_segredo') })
checar('assinatura de outro segredo é recusada', s === 401, `veio ${s}`)

// A assinatura é válida, mas para OUTRO pagamento: trocar o data.id na URL
// não pode valer, senão dá para reaproveitar uma notificação legítima.
const ts1 = agora()
s = await bater('9999999999', { ts: ts1, hash: assinar(ID, 'req-teste-1', ts1) })
checar('assinatura de outro pagamento não serve', s === 401, `veio ${s}`)

const ts2 = agora()
s = await bater(ID, { ts: ts2, hash: assinar(ID, 'req-teste-1', ts2), requestId: 'req-trocado' })
checar('request-id trocado invalida', s === 401, `veio ${s}`)

console.log('\n2. Assinatura velha é replay, não atraso')
const velho = agora() - 3600_000
s = await bater(ID, { ts: velho, hash: assinar(ID, 'req-teste-1', velho) })
checar('notificação de uma hora atrás é recusada', s === 401, `veio ${s}`)

console.log('\n3. Assinatura boa passa da portaria')
// Daqui em diante o Mercado Pago é consultado de verdade. Sem token válido a
// consulta falha, e o certo é 500 — que faz o Mercado Pago reenviar. O que
// importa neste teste é que NÃO seja 401: a assinatura foi aceita.
const ts3 = agora()
s = await bater(ID, { ts: ts3, hash: assinar(ID, 'req-teste-1', ts3) })
checar('assinatura correta passa da verificação', s !== 401, `veio ${s}`)
checar('falha na consulta pede reenvio (500), não engole', [500, 200].includes(s), `veio ${s}`)

console.log('\n4. As regras que decidem se o pedido vira pago')
// O Mercado Pago devolve payment_method_id "pix" mas payment_type_id
// "bank_transfer". Comparar o TYPE com "pix" reprovava todo PIX legítimo
// como divergente: o cliente pagava e o pedido nunca virava pago.
checar('PIX chega como bank_transfer e é aceito', meioConfere('pix', 'bank_transfer'))
checar('cartão de crédito é aceito no pedido em cartão', meioConfere('credit_card', 'credit_card'))
checar('cartão de débito também', meioConfere('credit_card', 'debit_card'))
checar('cartão NÃO passa num pedido fechado em PIX', !meioConfere('pix', 'credit_card'))
checar('PIX NÃO passa num pedido fechado em cartão', !meioConfere('credit_card', 'bank_transfer'))

checar('valor igual confere', valorConfere(67.15, 67.15))
checar('centavo a mais não confere', !valorConfere(67.15, 67.16))
checar('float não atrapalha (0.1+0.2)', valorConfere(0.1 + 0.2, 0.3))

checar('approved leva o pedido a pago', statusDoPedidoPara('approved') === 'paid')
checar('rejected cancela', statusDoPedidoPara('rejected') === 'cancelled')
checar('em análise não mexe no pedido', statusDoPedidoPara('in_process') === null)

console.log('\n5. Nada foi gravado por tentativa recusada')
const { rows: [n] } = await pool.query(
  "SELECT COUNT(*)::int AS c FROM payment_events WHERE payment_id IN ($1, $2)",
  [ID, '9999999999']
)
checar('nenhum evento de pagamento criado pelas tentativas', n.c === 0, `${n.c} eventos`)

const { rows: [p] } = await pool.query(
  "SELECT COUNT(*)::int AS c FROM orders WHERE payment_id IN ($1, $2)",
  [ID, '9999999999']
)
checar('nenhum pedido tocado pelas tentativas', p.c === 0, `${p.c} pedidos`)

console.log('\n6. Assunto que não é pagamento não quebra')
const ts4 = agora()
const outro = await fetch(`${API}/pagamentos/webhook?type=plan&data.id=${ID}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-request-id': 'req-teste-1',
    'x-signature': `ts=${ts4},v1=${assinar(ID, 'req-teste-1', ts4)}`,
  },
  body: JSON.stringify({ action: 'plan.updated', data: { id: ID } }),
}).then(r => r.status)
checar('assunto ignorado responde 200 para parar o reenvio', outro === 200, `veio ${outro}`)

await pool.end()
console.log(`\n${passou} passaram, ${falhou} falharam`)
process.exit(falhou ? 1 : 0)
