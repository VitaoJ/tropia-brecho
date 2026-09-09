import { useState, useEffect, useCallback } from 'react'
import { listarPedidos, buscarPedidoAdmin, mudarStatusPedido, formatarPreco } from '../../services/api'

/* Os mesmos nomes que o cliente vê, para não haver dois vocabulários para o
   mesmo pedido. A cor diz o que exige ação: âmbar espera, verde andou. */
const STATUS = {
  pending:   { label: 'Aguardando pagamento', cor: 'bg-[#fdf1e3] text-[#8a4b00] border-[#e0a45c]' },
  paid:      { label: 'Pago',                 cor: 'bg-[#e6f0e8] text-[#1e5631] border-[#8fbf9f]' },
  shipped:   { label: 'Enviado',              cor: 'bg-[#e6ecf0] text-[#1e4356] border-[#8fa9bf]' },
  delivered: { label: 'Entregue',             cor: 'bg-[#e6f0e8] text-[#1e5631] border-[#8fbf9f]' },
  cancelled: { label: 'Cancelado',            cor: 'bg-[#f0e6e6] text-[#7a1f1f] border-[#bf8f8f]' },
}

// Espelha a máquina de status do servidor. Se divergir, o painel oferece um
// botão que o servidor recusa — e a culpa parece do painel.
const SEGUINTES = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const FILTROS = [
  ['', 'Todos'],
  ['pending', 'Aguardando'],
  ['paid', 'Pagos'],
  ['shipped', 'Enviados'],
  ['delivered', 'Entregues'],
  ['cancelled', 'Cancelados'],
]

const data = (iso) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
})

function Etiqueta({ status }) {
  const s = STATUS[status] ?? { label: status, cor: 'bg-[#eae1d4] text-[#654a2b] border-[#d6c8b3]' }
  return (
    <span className={`inline-block text-[10px] tracking-[0.08em] px-2 py-0.5 rounded-sm border ${s.cor}`}>
      {s.label}
    </span>
  )
}

/* ─── Detalhe ────────────────────────────────────────────────────
   Abre por cima; é aqui que estão os dados que só o dono pode ver. */
function Detalhe({ id, token, aoFechar, aoMudar, onErro }) {
  const [pedido, setPedido] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarPedidoAdmin(id, token).then(r => setPedido(r.pedido)).catch(e => onErro(e.message))
  }, [id, token, onErro])

  const mudar = async (novo) => {
    const aviso = novo === 'cancelled'
      ? 'Cancelar devolve as peças para a vitrine. Confirma?'
      : `Marcar como "${STATUS[novo].label}"?`
    if (!confirm(aviso)) return
    setSalvando(true)
    try {
      await mudarStatusPedido(id, novo, token)
      const r = await buscarPedidoAdmin(id, token)
      setPedido(r.pedido)
      aoMudar()
    } catch (e) { onErro(e.message) }
    finally { setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#250000]/50 flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={aoFechar}>
      <div className="bg-[#eae1d4] w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-lg md:rounded-sm"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-[#eae1d4] border-b border-[#d6c8b3] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-[#250000] font-medium">
              Pedido {pedido?.numero ?? '…'}
            </p>
            {pedido && <p className="text-[11px] text-[#654a2b]">{data(pedido.criado_em)}</p>}
          </div>
          <button onClick={aoFechar} aria-label="Fechar"
            className="w-9 h-9 flex-none flex items-center justify-center text-2xl leading-none text-[#250000]">×</button>
        </div>

        {!pedido ? (
          <p className="p-6 text-sm text-[#654a2b]">Carregando…</p>
        ) : (
          <div className="p-4 md:p-6 flex flex-col gap-5">

            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta status={pedido.status} />
              {/* Só aparece quando conta uma história diferente do nosso status */}
              {pedido.payment_status && pedido.payment_status !== pedido.status && (
                <span className="text-[10px] text-[#654a2b] border border-[#d6c8b3] rounded-sm px-2 py-0.5">
                  Mercado Pago: {pedido.payment_status}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-2">Peças</h3>
              <ul className="flex flex-col gap-2">
                {pedido.itens.map((i, n) => (
                  <li key={n} className="flex gap-3 items-center">
                    <div className="w-10 h-12 bg-[#d6c8b3] rounded-sm flex-none overflow-hidden">
                      {i.imagem && <img src={i.imagem} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="flex-1 min-w-0 text-sm text-[#250000] truncate">
                      {i.nome}{i.tamanho && <span className="text-[#654a2b]"> · {i.tamanho}</span>}
                    </span>
                    <span className="text-sm text-[#250000] flex-none">{formatarPreco(i.preco)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm flex flex-col gap-1">
              <div className="flex justify-between text-[#654a2b]">
                <span>Subtotal</span><span>{formatarPreco(pedido.subtotal)}</span>
              </div>
              {pedido.desconto > 0 && (
                <div className="flex justify-between text-[#1e5631]">
                  <span>Desconto{pedido.cupom && ` · ${pedido.cupom}`}</span>
                  <span>− {formatarPreco(pedido.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#654a2b]">
                <span>Frete{pedido.entrega && ` · ${pedido.entrega}`}</span>
                <span>{pedido.frete === 0 ? 'Grátis' : formatarPreco(pedido.frete)}</span>
              </div>
              <div className="flex justify-between text-[#250000] font-medium pt-1 border-t border-[#d6c8b3]">
                <span>Total ({pedido.forma_pagamento === 'pix' ? 'PIX' : 'cartão'})</span>
                <span>{formatarPreco(pedido.total)}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-1.5">Cliente</h3>
                <p className="text-[#250000]">{pedido.cliente.nome}</p>
                <p className="text-[#654a2b] text-[13px] break-all">{pedido.cliente.email}</p>
                <p className="text-[#654a2b] text-[13px]">{pedido.cliente.telefone}</p>
                <p className="text-[#654a2b] text-[13px]">CPF {pedido.cliente.cpf}</p>
              </div>
              <div>
                <h3 className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-1.5">Entrega</h3>
                <p className="text-[#250000] text-[13px] leading-relaxed">
                  {pedido.endereco.rua}, {pedido.endereco.numero}
                  {pedido.endereco.complemento && ` · ${pedido.endereco.complemento}`}<br />
                  {pedido.endereco.bairro} · {pedido.endereco.cidade}/{pedido.endereco.estado}<br />
                  CEP {pedido.endereco.cep}
                </p>
              </div>
            </div>

            {pedido.payment_id && (
              <p className="text-[11px] text-[#654a2b]">
                Pagamento no Mercado Pago: <span className="font-mono">{pedido.payment_id}</span>
              </p>
            )}

            {SEGUINTES[pedido.status]?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#d6c8b3]">
                {SEGUINTES[pedido.status].map(s => (
                  <button key={s} onClick={() => mudar(s)} disabled={salvando}
                    className={`h-10 px-4 text-[12px] tracking-[0.08em] rounded-sm disabled:opacity-50 ${
                      s === 'cancelled'
                        ? 'border border-[#bf8f8f] text-[#7a1f1f] hover:bg-[#f0e6e6]'
                        : 'bg-[#250000] text-[#eae1d4] hover:bg-[#432d1c]'
                    }`}>
                    {s === 'cancelled' ? 'Cancelar pedido' : `Marcar como ${STATUS[s].label.toLowerCase()}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SecaoPedidos({ token, onErro }) {
  const [pedidos, setPedidos] = useState([])
  const [total, setTotal] = useState(0)
  const [filtro, setFiltro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await listarPedidos({ status: filtro || undefined }, token)
      setPedidos(r.pedidos)
      setTotal(r.total)
    } catch (e) { onErro(e.message) }
    finally { setCarregando(false) }
  }, [filtro, token, onErro])

  useEffect(() => { carregar() }, [carregar])

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl text-[#250000]">Pedidos</h1>
          <p className="text-xs text-[#654a2b] mt-0.5">
            {carregando ? 'carregando…' : `${total} ${total === 1 ? 'pedido' : 'pedidos'}`}
          </p>
        </div>
      </div>

      {/* Filtros rolam na horizontal no celular em vez de quebrar linha */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0 escondeBarra">
        {FILTROS.map(([v, label]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`flex-none h-8 px-3 text-[12px] rounded-sm border transition-colors ${
              filtro === v
                ? 'bg-[#250000] text-[#eae1d4] border-[#250000]'
                : 'border-[#d6c8b3] text-[#654a2b] hover:border-[#250000]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {!carregando && pedidos.length === 0 && (
        <p className="text-sm text-[#654a2b] py-8">
          Nenhum pedido {filtro ? 'com esse status' : 'ainda'}.
        </p>
      )}

      {/* Celular: cartões. A tabela tem 6 colunas e não cabe em 375px. */}
      <ul className="md:hidden flex flex-col gap-2">
        {pedidos.map(p => (
          <li key={p.id}>
            <button onClick={() => setAberto(p.id)}
              className="w-full text-left border border-[#d6c8b3] bg-[#f2ead9] rounded-sm p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm text-[#250000] font-medium">{p.numero}</span>
                <Etiqueta status={p.status} />
              </div>
              <p className="text-[13px] text-[#250000] truncate">{p.cliente}</p>
              <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-[#654a2b]">
                <span>{data(p.created_at)} · {p.pecas} {p.pecas === 1 ? 'peça' : 'peças'}</span>
                <span className="text-[#250000] text-[13px]">{formatarPreco(p.total)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-[#250000]">
          <thead className="text-[10px] tracking-[0.14em] text-[#654a2b] uppercase">
            <tr className="border-b border-[#d6c8b3]">
              <th className="text-left py-2 font-normal">Pedido</th>
              <th className="text-left py-2 font-normal">Cliente</th>
              <th className="text-left py-2 font-normal">Data</th>
              <th className="text-left py-2 font-normal">Peças</th>
              <th className="text-left py-2 font-normal">Status</th>
              <th className="text-right py-2 font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p => (
              <tr key={p.id} onClick={() => setAberto(p.id)}
                className="border-b border-[#d6c8b3]/60 hover:bg-[#f2ead9] cursor-pointer">
                <td className="py-2.5 font-medium">{p.numero}</td>
                <td className="py-2.5">
                  <span className="block truncate max-w-[220px]">{p.cliente}</span>
                  <span className="block text-[11px] text-[#654a2b] truncate max-w-[220px]">{p.email}</span>
                </td>
                <td className="py-2.5 text-[13px] text-[#654a2b] whitespace-nowrap">{data(p.created_at)}</td>
                <td className="py-2.5">{p.pecas}</td>
                <td className="py-2.5"><Etiqueta status={p.status} /></td>
                <td className="py-2.5 text-right whitespace-nowrap">{formatarPreco(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aberto && (
        <Detalhe id={aberto} token={token} onErro={onErro}
          aoFechar={() => setAberto(null)} aoMudar={carregar} />
      )}
    </>
  )
}
