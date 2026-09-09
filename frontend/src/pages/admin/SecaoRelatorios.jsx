import { useState, useEffect } from 'react'
import { buscarRelatorios, formatarPreco } from '../../services/api'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const rotuloMes = (iso) => {
  const [ano, mes] = iso.split('-')
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`
}

/**
 * Barras em CSS puro, sem biblioteca de gráfico.
 *
 * São doze valores numa tela pequena: uma dependência de 40 kB para isso
 * pesaria mais no celular do que ajuda. A altura é proporcional ao maior mês,
 * e o valor vem escrito — barra sem número obriga a adivinhar.
 */
function Barras({ dados }) {
  const maior = Math.max(...dados.map(d => d.faturamento), 1)

  return (
    <div className="border border-[#d6c8b3] bg-[#f2ead9] rounded-sm p-4">
      <div className="flex items-end gap-1 md:gap-2 h-40">
        {dados.map(d => {
          const altura = (d.faturamento / maior) * 100
          return (
            <div key={d.mes} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1"
              title={`${rotuloMes(d.mes)}: ${formatarPreco(d.faturamento)} em ${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}`}>
              {d.faturamento > 0 && (
                <span className="text-[9px] text-[#654a2b] tabular-nums leading-none">
                  {Math.round(d.faturamento)}
                </span>
              )}
              {/* min-h para o mês zerado ainda desenhar um traço: barra
                  invisível parece dado faltando, não venda zero. */}
              <div className="w-full rounded-t-sm bg-[#250000] min-h-[2px] transition-[height] duration-500"
                style={{ height: `${altura}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 md:gap-2 mt-2">
        {dados.map(d => (
          <span key={d.mes} className="flex-1 min-w-0 text-center text-[9px] md:text-[10px] text-[#654a2b] truncate">
            {rotuloMes(d.mes)}
          </span>
        ))}
      </div>
    </div>
  )
}

/* Lista com barra de proporção no fundo: mostra a fatia sem virar pizza,
   que em tela de celular fica ilegível com mais de três fatias. */
function Ranking({ titulo, nota, linhas, vazio }) {
  const maior = Math.max(...linhas.map(l => l.valor), 1)

  return (
    <div>
      <h2 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-1">{titulo}</h2>
      {/* Sem esta linha, categoria (só peças) e pagamento (peças + frete)
          dão totais diferentes e parecem conta errada. */}
      {nota && <p className="text-[11px] text-[#654a2b]/80 mb-2.5">{nota}</p>}
      {linhas.length === 0 ? (
        <p className="text-sm text-[#654a2b]">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {linhas.map(l => (
            <li key={l.nome} className="relative overflow-hidden rounded-sm border border-[#d6c8b3] bg-[#f2ead9]">
              <span className="absolute inset-y-0 left-0 bg-[#d6c8b3]/60"
                style={{ width: `${(l.valor / maior) * 100}%` }} />
              <div className="relative flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-[#250000] truncate">{l.nome}</span>
                <span className="text-sm text-[#250000] flex-none whitespace-nowrap">
                  {formatarPreco(l.valor)}
                  {l.nota && <span className="text-[11px] text-[#654a2b]"> · {l.nota}</span>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SecaoRelatorios({ token, onErro }) {
  const [d, setD] = useState(null)

  useEffect(() => {
    buscarRelatorios(token).then(setD).catch(e => onErro(e.message))
  }, [token, onErro])

  if (!d) return <p className="text-sm text-[#654a2b] py-8">Carregando…</p>

  const semVenda = d.faturamento.pedidos === 0

  return (
    <>
      <h1 className="text-xl md:text-2xl text-[#250000] mb-1">Relatórios</h1>
      <p className="text-xs text-[#654a2b] mb-5 md:mb-6">
        Doze meses. Só pedido pago, enviado ou entregue.
      </p>

      {semVenda ? (
        <p className="text-sm text-[#654a2b] leading-relaxed max-w-[60ch] py-4">
          Ainda não há venda confirmada para relatar. Assim que o primeiro
          pedido for pago, esta tela passa a mostrar faturamento por mês,
          por categoria e por forma de pagamento.
        </p>
      ) : (
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="border border-[#d6c8b3] bg-[#f2ead9] rounded-sm p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#654a2b] uppercase mb-1.5">Faturamento total</p>
              <p className="text-2xl text-[#250000] leading-none">{formatarPreco(d.faturamento.total)}</p>
            </div>
            <div className="border border-[#d6c8b3] bg-[#f2ead9] rounded-sm p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#654a2b] uppercase mb-1.5">Vendas</p>
              <p className="text-2xl text-[#250000] leading-none">{d.faturamento.pedidos}</p>
            </div>
            <div className="border border-[#d6c8b3] bg-[#f2ead9] rounded-sm p-4">
              <p className="text-[10px] tracking-[0.18em] text-[#654a2b] uppercase mb-1.5">Ticket médio</p>
              <p className="text-2xl text-[#250000] leading-none">{formatarPreco(d.faturamento.ticket)}</p>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-3">Faturamento por mês</h2>
            <Barras dados={d.por_mes} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <Ranking titulo="Por categoria" nota="Só o preço das peças, sem frete" vazio="Sem vendas ainda"
              linhas={d.por_categoria.map(c => ({
                nome: c.categoria, valor: c.faturamento,
                nota: `${c.pecas} ${c.pecas === 1 ? 'peça' : 'peças'}`,
              }))} />

            <Ranking titulo="Por forma de pagamento" nota="Total recebido, frete incluído" vazio="Sem vendas ainda"
              linhas={d.por_pagamento.map(p => ({
                nome: p.forma === 'pix' ? 'PIX' : 'Cartão', valor: p.faturamento,
                nota: `${p.pedidos} ${p.pedidos === 1 ? 'pedido' : 'pedidos'}`,
              }))} />
          </div>
        </div>
      )}
    </>
  )
}
