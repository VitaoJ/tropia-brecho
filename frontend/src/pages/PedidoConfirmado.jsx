import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buscarPedidoPublico } from '../services/api'
import { formatarPreco } from '../utils/preco'

const CONTAINER = 'max-w-2xl mx-auto px-4 md:px-8'

// Vira true na tarefa 6, quando o Mercado Pago entrar. Enquanto for false, o
// pedido é registrado mas ninguém consegue pagar pelo site — e a tela precisa
// dizer isso em vez de fingir que a compra terminou.
const PAGAMENTO_ATIVO = false

const ROTULO = {
  pending:   { texto: 'Aguardando pagamento', cor: '#8a4b00', fundo: '#fdf1e3', borda: '#e0a45c' },
  paid:      { texto: 'Pagamento confirmado', cor: '#2d6a4f', fundo: '#d8f3dc', borda: '#95d5b2' },
  shipped:   { texto: 'A caminho',            cor: '#2d6a4f', fundo: '#d8f3dc', borda: '#95d5b2' },
  delivered: { texto: 'Entregue',             cor: '#2d6a4f', fundo: '#d8f3dc', borda: '#95d5b2' },
  cancelled: { texto: 'Cancelado',            cor: '#c44b00', fundo: '#fdf1e3', borda: '#c44b00' },
}

export default function PedidoConfirmado() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    buscarPedidoPublico(id)
      .then(({ pedido }) => setPedido(pedido))
      .catch(e => setErro(e.message))
  }, [id])

  if (erro) {
    return (
      <section className={`${CONTAINER} py-20 text-center`}>
        <p className="text-sm text-[#654a2b] mb-4">Não encontramos esse pedido.</p>
        <Link to="/catalogo"
          className="text-xs tracking-[0.14em] border border-[#250000] px-5 py-2.5 text-[#250000]
            hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
          VOLTAR AO CATÁLOGO
        </Link>
      </section>
    )
  }

  if (!pedido) {
    return <section className={`${CONTAINER} py-20`}><p className="text-sm text-[#654a2b]">Carregando...</p></section>
  }

  const estado = ROTULO[pedido.status] ?? ROTULO.pending

  return (
    <section className={`${CONTAINER} pt-8 md:pt-16 pb-16 md:pb-24`}>
      <p className="text-[11px] tracking-[0.2em] text-[#654a2b] uppercase mb-2">
        Pedido {pedido.numero}
      </p>
      <h1 className="text-2xl md:text-4xl font-medium text-[#250000] leading-tight mb-5">
        Recebemos seu pedido.
      </h1>

      <div className="rounded-sm border px-4 py-3 mb-6"
        style={{ background: estado.fundo, borderColor: estado.borda }}>
        <p className="text-sm font-medium" style={{ color: estado.cor }}>{estado.texto}</p>

        {pedido.status === 'pending' && (
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: estado.cor }}>
            {PAGAMENTO_ATIVO
              ? 'Assim que o pagamento cair, suas peças são separadas e enviadas em até 2 dias úteis.'
              : 'O pagamento pelo site ainda não está ativo — vamos entrar em contato pelo e-mail que você cadastrou para combinar. Suas peças estão guardadas.'}
          </p>
        )}
      </div>

      <div className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-4 flex flex-col gap-3">
        <h2 className="text-[11px] tracking-[0.16em] text-[#654a2b] uppercase">
          {pedido.itens.length} {pedido.itens.length === 1 ? 'peça' : 'peças'}
        </h2>

        <ul className="flex flex-col gap-2.5">
          {pedido.itens.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-center">
              <div className="w-12 h-15 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden" style={{ height: '3.75rem' }}>
                {item.imagem && <img src={item.imagem} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-[#250000] leading-tight">{item.nome}</p>
                {item.tamanho && <p className="text-[11px] text-[#654a2b]">Tam. {item.tamanho}</p>}
              </div>
              <span className="text-[14px] text-[#250000] flex-none">{formatarPreco(item.preco)}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-[#d6c8b3]" />

        <div className="flex flex-col gap-1.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#654a2b]">Subtotal</span>
            <span className="text-[#250000]">{formatarPreco(pedido.subtotal)}</span>
          </div>
          {pedido.desconto > 0 && (
            <div className="flex justify-between text-[#2d6a4f]">
              <span>Desconto</span>
              <span>− {formatarPreco(pedido.desconto)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#654a2b]">Frete</span>
            <span className="text-[#250000]">
              {Number(pedido.frete) === 0 ? 'Grátis' : formatarPreco(pedido.frete)}
            </span>
          </div>
        </div>

        <div className="border-t border-[#d6c8b3]" />

        <div className="flex justify-between items-baseline">
          <span className="text-sm text-[#250000]">
            Total {pedido.forma_pagamento === 'pix' ? 'no PIX' : 'no cartão'}
          </span>
          <span className="text-xl font-medium text-[#250000]">{formatarPreco(pedido.total)}</span>
        </div>
      </div>

      <p className="text-[11px] text-[#654a2b] mt-4 leading-relaxed">
        Guarde o número <strong className="font-medium text-[#250000]">{pedido.numero}</strong> para
        falar com a gente sobre este pedido.
      </p>

      <Link to="/catalogo"
        className="inline-block mt-8 text-xs tracking-[0.14em] border border-[#250000] px-5 py-3
          text-[#250000] hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
        CONTINUAR EXPLORANDO
      </Link>
    </section>
  )
}
