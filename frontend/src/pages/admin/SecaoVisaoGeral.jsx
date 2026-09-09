import { useState, useEffect } from 'react'
import { buscarRelatorios, formatarPreco } from '../../services/api'

/* Um número grande e o que ele quer dizer. `destaque` é para o que pede
   ação hoje — pedido esperando pagamento, peça reservada agora. */
function Cartao({ rotulo, valor, nota, destaque = false }) {
  return (
    <div className={`border rounded-sm p-4 ${
      destaque ? 'border-[#e0a45c] bg-[#fdf1e3]' : 'border-[#d6c8b3] bg-[#f2ead9]'
    }`}>
      <p className="text-[10px] tracking-[0.18em] text-[#654a2b] uppercase mb-1.5">{rotulo}</p>
      <p className={`text-2xl md:text-3xl leading-none ${destaque ? 'text-[#8a4b00]' : 'text-[#250000]'}`}>
        {valor}
      </p>
      {nota && <p className="text-[11px] text-[#654a2b] mt-1.5 leading-snug">{nota}</p>}
    </div>
  )
}

export default function SecaoVisaoGeral({ token, onErro, aoIrParaPedidos }) {
  const [d, setD] = useState(null)

  useEffect(() => {
    buscarRelatorios(token).then(setD).catch(e => onErro(e.message))
  }, [token, onErro])

  if (!d) return <p className="text-sm text-[#654a2b] py-8">Carregando…</p>

  const esperando = d.status.pending
  const paraEnviar = d.status.paid

  return (
    <>
      <h1 className="text-xl md:text-2xl text-[#250000] mb-1">Visão geral</h1>
      <p className="text-xs text-[#654a2b] mb-5 md:mb-6">
        Faturamento conta só pedido pago, enviado ou entregue.
      </p>

      {/* O que pede ação vem primeiro, e some quando não há nada a fazer:
          cartão zerado todo dia vira ruído e a pessoa para de olhar. */}
      {(esperando > 0 || paraEnviar > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {esperando > 0 && (
            <button onClick={aoIrParaPedidos} className="text-left">
              <Cartao destaque rotulo="Aguardando pagamento" valor={esperando}
                nota="Peça reservada por 30 min; depois volta para a vitrine" />
            </button>
          )}
          {paraEnviar > 0 && (
            <button onClick={aoIrParaPedidos} className="text-left">
              <Cartao destaque rotulo="Pago, falta enviar" valor={paraEnviar}
                nota="Já é dinheiro em caixa esperando etiqueta" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao rotulo="Faturamento do mês" valor={formatarPreco(d.faturamento.mes)} />
        <Cartao rotulo="Ticket médio" valor={formatarPreco(d.faturamento.ticket)}
          nota={`${d.faturamento.pedidos} ${d.faturamento.pedidos === 1 ? 'venda' : 'vendas'} até hoje`} />
        <Cartao rotulo="Peças na vitrine" valor={d.estoque.disponiveis}
          nota={d.estoque.reservadas > 0 ? `${d.estoque.reservadas} em checkout agora` : null} />
        <Cartao rotulo="Peças vendidas" valor={d.estoque.vendidas} />
      </div>

      {d.ultimas_vendidas.length > 0 && (
        <div className="mt-6 md:mt-8">
          <h2 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-3">Últimas peças que saíram</h2>
          <ul className="border-t border-[#d6c8b3]">
            {d.ultimas_vendidas.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#d6c8b3]/60">
                <span className="text-sm text-[#250000] truncate">
                  {p.nome}{p.tamanho && <span className="text-[#654a2b]"> · {p.tamanho}</span>}
                </span>
                <span className="text-sm text-[#250000] flex-none">{formatarPreco(p.preco)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.faturamento.pedidos === 0 && (
        <p className="text-sm text-[#654a2b] mt-6 leading-relaxed max-w-[60ch]">
          Nenhuma venda confirmada ainda. Quando o primeiro pedido for pago,
          os números aparecem aqui sozinhos.
        </p>
      )}
    </>
  )
}
