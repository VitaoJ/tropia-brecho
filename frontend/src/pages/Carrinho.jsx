import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { validarCupom, listarProdutos } from '../services/api'
import {
  formatarPreco, normalizarProduto,
  FRETE_GRATIS_ACIMA_DE, DESCONTO_PIX,
} from '../utils/preco'
import ProductCard from '../components/ProductCard'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/* ─── Progresso do frete grátis ──────────────────────────────── */
function BarraFrete({ valor }) {
  const falta = FRETE_GRATIS_ACIMA_DE - valor
  const atingiu = falta <= 0
  const progresso = Math.min((valor / FRETE_GRATIS_ACIMA_DE) * 100, 100)

  return (
    <div className={`rounded-sm p-3 ${atingiu ? 'bg-[#d8f3dc]' : 'bg-[#f2ead9] border border-[#d6c8b3]'}`}>
      <p className={`text-xs mb-2 ${atingiu ? 'text-[#2d6a4f]' : 'text-[#654a2b]'}`}>
        {atingiu
          ? <><strong className="font-medium">Frete grátis liberado!</strong> Você não paga entrega.</>
          : <>Faltam <strong className="font-medium text-[#250000]">{formatarPreco(falta)}</strong> para frete grátis</>}
      </p>
      <div className="h-1.5 rounded-full bg-[#d6c8b3] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progresso}%`, background: atingiu ? '#2d6a4f' : '#ffc509' }} />
      </div>
    </div>
  )
}

/* ─── Cupom ──────────────────────────────────────────────────── */
function CampoCupom() {
  const { cupom, setCupom } = useCart()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState(null)
  const [validando, setValidando] = useState(false)

  const aplicar = async (e) => {
    e.preventDefault()
    if (!codigo.trim()) return
    setValidando(true)
    setErro(null)
    try {
      const { cupom: c } = await validarCupom(codigo)
      setCupom(c)
      setCodigo('')
    } catch (err) {
      setErro(err.message)
    } finally {
      setValidando(false)
    }
  }

  if (cupom) {
    return (
      <div className="flex items-center justify-between gap-3 bg-[#d8f3dc] rounded-sm px-3 py-2.5">
        <span className="text-xs text-[#2d6a4f]">
          Cupom <strong className="font-medium tracking-[0.06em]">{cupom.code}</strong> — {cupom.discount_percent}% de desconto
        </span>
        <button onClick={() => setCupom(null)}
          className="text-xs text-[#654a2b] underline underline-offset-2 flex-none">
          remover
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={aplicar}>
      <div className="flex gap-2">
        <input value={codigo} onChange={(e) => { setCodigo(e.target.value); setErro(null) }}
          placeholder="Cupom de desconto"
          className="flex-1 min-w-0 h-11 px-3 bg-[#f2ead9] border border-[#d6c8b3] rounded-sm text-sm uppercase
            outline-none focus:border-[#654a2b] placeholder:normal-case placeholder:text-[#654a2b]/60" />
        <button type="submit" disabled={validando || !codigo.trim()}
          className="h-11 px-4 border border-[#250000] text-[#250000] text-xs tracking-[0.12em] rounded-sm
            disabled:opacity-40 hover:bg-[#250000] hover:text-[#eae1d4] transition-colors flex-none">
          {validando ? '...' : 'APLICAR'}
        </button>
      </div>
      {erro && <p className="text-xs text-[#c44b00] mt-1.5">{erro}</p>}
    </form>
  )
}

/* ─── Combina com ────────────────────────────────────────────── */
// Peças similares competem entre si; acessório que fecha o look soma.
function CombinaCom({ itens }) {
  const [sugestoes, setSugestoes] = useState([])

  useEffect(() => {
    if (itens.length === 0) return
    const genero = itens.find(i => i.genero)?.genero
    const jaTem = new Set(itens.map(i => i.id))
    const categoriasNoCarrinho = new Set(itens.map(i => i.categoriaSlug).filter(Boolean))

    listarProdutos({ genero, limite: 20 })
      .then(({ produtos }) => {
        const outras = produtos.filter(p =>
          !jaTem.has(p.id) && !categoriasNoCarrinho.has(p.categoria_slug))
        // Se tudo no estoque for da mesma categoria, mostra o que sobrar
        const escolhidas = outras.length > 0
          ? outras
          : produtos.filter(p => !jaTem.has(p.id))
        setSugestoes(escolhidas.slice(0, 4).map(normalizarProduto))
      })
      .catch(err => console.warn('Sugestões indisponíveis:', err.message))
  }, [itens])

  if (sugestoes.length === 0) return null

  return (
    <section className="pt-10 md:pt-16">
      <h2 className="text-xs md:text-sm tracking-[0.2em] text-[#654a2b] uppercase mb-3 md:mb-6">
        Combina com
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {sugestoes.map(p => <ProductCard key={p.id} produto={p} />)}
      </div>
    </section>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
export default function Carrinho() {
  const navigate = useNavigate()
  const {
    itens, remover, cupom, quantidade,
    subtotal, descontoCupom, frete, totalCartao, totalPix, economiaPix,
  } = useCart()

  if (quantidade === 0) {
    return (
      <section className={`${CONTAINER} py-20 md:py-32`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d6c8b3" strokeWidth="1.4">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p className="text-sm text-[#654a2b]">Seu carrinho está vazio.</p>
          <Link to="/catalogo"
            className="text-xs tracking-[0.14em] border border-[#250000] px-5 py-2.5 text-[#250000] hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
            EXPLORAR CATÁLOGO
          </Link>
        </div>
      </section>
    )
  }

  const linha = (rotulo, valor, destaque) => (
    <div className="flex justify-between text-sm">
      <span className={destaque ? 'text-[#2d6a4f]' : 'text-[#654a2b]'}>{rotulo}</span>
      <span className={destaque ? 'text-[#2d6a4f]' : 'text-[#250000]'}>{valor}</span>
    </div>
  )

  return (
    <section className={`${CONTAINER} pt-6 md:pt-12 pb-12 md:pb-20`}>
      <h1 className="text-2xl md:text-4xl font-medium text-[#250000] mb-1">Carrinho</h1>
      <p className="text-xs text-[#654a2b] mb-6 md:mb-8">
        {quantidade} {quantidade === 1 ? 'peça' : 'peças'}
      </p>

      <div className="md:flex md:gap-10 lg:gap-16 md:items-start">
        {/* Itens */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {itens.map(item => (
            <div key={item.id} className="flex gap-3 md:gap-4 border border-[#d6c8b3] rounded-sm p-3 bg-[#f2ead9]">
              <Link to={`/produto/${item.id}`}
                className="w-20 h-24 md:w-24 md:h-32 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
                {item.imagem && <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover" />}
              </Link>

              <div className="flex-1 min-w-0 flex flex-col">
                <Link to={`/produto/${item.id}`} className="text-[#250000] leading-tight hover:underline">
                  {item.nome}
                </Link>
                {item.tamanho && (
                  <span className="text-[11px] text-[#654a2b] mt-0.5">Tam. {item.tamanho}</span>
                )}
                <span className="text-[11px] text-[#654a2b] mt-1">Peça única</span>

                <div className="flex items-end justify-between gap-3 mt-auto pt-2">
                  <span className="text-[#250000] font-medium">{formatarPreco(item.preco)}</span>
                  <button onClick={() => remover(item.id)}
                    className="text-xs text-[#654a2b] underline underline-offset-2 hover:text-[#c44b00]">
                    remover
                  </button>
                </div>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-[#654a2b] mt-1 leading-relaxed">
            Cada peça do brechó é única. Se sair do estoque, não volta — o item
            só fica garantido depois do pagamento confirmado.
          </p>
        </div>

        {/* Resumo */}
        <aside className="md:w-80 flex-none mt-8 md:mt-0 md:sticky md:top-24 flex flex-col gap-4">
          <BarraFrete valor={subtotal - descontoCupom} />
          <CampoCupom />

          <div className="border border-[#d6c8b3] rounded-sm p-4 bg-[#f2ead9] flex flex-col gap-2.5">
            {linha('Subtotal', formatarPreco(subtotal))}
            {cupom && linha(`Cupom ${cupom.code}`, `− ${formatarPreco(descontoCupom)}`, true)}
            {linha('Frete', frete === 0 ? 'Grátis' : formatarPreco(frete))}

            <div className="border-t border-[#d6c8b3] my-1" />

            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[#654a2b]">Total no cartão</span>
              <span className="text-lg font-medium text-[#250000]">{formatarPreco(totalCartao)}</span>
            </div>

            <div className="bg-[#eae1d4] rounded-sm px-3 py-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-[#250000] font-medium">No PIX</span>
                <span className="text-xl font-medium text-[#250000]">{formatarPreco(totalPix)}</span>
              </div>
              <p className="text-[11px] text-[#2d6a4f] mt-0.5">
                Você economiza {formatarPreco(economiaPix)} ({DESCONTO_PIX * 100}% de desconto)
              </p>
            </div>

            <button onClick={() => navigate('/checkout')}
              className="h-12 mt-1 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.16em] rounded-sm hover:opacity-90 transition-opacity">
              FINALIZAR COMPRA
            </button>

            <Link to="/catalogo"
              className="text-xs text-[#654a2b] text-center underline underline-offset-4 hover:text-[#250000]">
              continuar comprando
            </Link>
          </div>
        </aside>
      </div>

      <CombinaCom itens={itens} />
    </section>
  )
}
