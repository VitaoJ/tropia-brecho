import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import { useCart } from '../context/CartContext'
import { buscarProduto } from '../services/api'
import { formatarPreco, calcularDesconto, precoComPix, normalizarProduto } from '../utils/preco'
import ProductCard from '../components/ProductCard'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

const PRODUTO_EXEMPLO = {
  id: 1,
  nome: 'Vestido Midi Floral',
  marca: 'Referência anos 80',
  tags: ['Feminino', 'Vintage', 'Floral'],
  preco: 98.00,
  desconto: null,
  tamanho: 'M',
  medidas: { ombro: 38, busto: 88, cintura: 72, comprimento: 110, manga: null },
  condicao: 'Ótimo',
  descricao: 'Vestido midi com estampa floral em tons terrosos. Tecido leve, ideal para dias quentes. Decote V e manga curta bufante.',
  fotos: ['#c4ae90', '#a98f6e', '#d6c8b3'],
}

const CONDICAO_CONFIG = {
  'Ótimo':   { cor: '#2d6a4f', bg: '#d8f3dc' },
  'Bom':     { cor: '#b57e10', bg: '#fff3cd' },
  'Regular': { cor: '#c44b00', bg: '#ffe0cc' },
}
const CONDICAO_LABEL = { otimo: 'Ótimo', bom: 'Bom', regular: 'Regular' }
const CORES_SEM_FOTO = ['#c4ae90', '#a98f6e', '#d6c8b3']

/* ─── Galeria ────────────────────────────────────────────────── */
function Galeria({ fotos, nome }) {
  const [idx, setIdx] = useState(0)
  const inicioX = useRef(null)

  const ir = (i) => setIdx((i + fotos.length) % fotos.length)

  // Setas do teclado funcionam junto com o swipe e os botões
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'ArrowLeft') ir(idx - 1)
      if (e.key === 'ArrowRight') ir(idx + 1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [idx, fotos.length])

  const aoTocar = (e) => { inicioX.current = e.touches[0].clientX }
  const aoSoltar = (e) => {
    if (inicioX.current === null) return
    const dif = inicioX.current - e.changedTouches[0].clientX
    if (Math.abs(dif) > 40) ir(idx + (dif > 0 ? 1 : -1))
    inicioX.current = null
  }

  const ehCor = (f) => f.startsWith('#')

  return (
    <div className="md:flex md:gap-4">
      {/* Miniaturas — coluna lateral no desktop */}
      {fotos.length > 1 && (
        <div className="hidden md:flex flex-col gap-2 flex-none w-20">
          {fotos.map((f, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-sm overflow-hidden transition-opacity ${idx === i ? 'ring-2 ring-[#250000]' : 'opacity-60 hover:opacity-100'}`}
              style={{ aspectRatio: '3/4', background: ehCor(f) ? f : '#d6c8b3' }}>
              {!ehCor(f) && <img src={f} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
        </div>
      )}

      <div className="relative overflow-hidden md:rounded-sm flex-1 group"
        style={{ aspectRatio: '3/4' }}
        onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
        <div className="flex h-full transition-transform duration-400 ease-in-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}>
          {fotos.map((f, i) => (
            ehCor(f)
              ? <div key={i} className="flex-none w-full h-full" style={{ background: f }} />
              : <img key={i} src={f} alt={`${nome} — foto ${i + 1}`}
                  className="flex-none w-full h-full object-cover" />
          ))}
        </div>

        {fotos.length > 1 && (
          <>
            {/* Setas: sempre visíveis no toque, aparecem no hover do desktop */}
            {[['‹', -1, 'left-2'], ['›', 1, 'right-2']].map(([icone, passo, lado]) => (
              <button key={lado} onClick={() => ir(idx + passo)}
                aria-label={passo < 0 ? 'Foto anterior' : 'Próxima foto'}
                className={`absolute ${lado} top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full
                  bg-[#eae1d4]/80 backdrop-blur-sm text-[#250000] text-xl md:text-2xl leading-none
                  flex items-center justify-center transition-opacity hover:bg-[#eae1d4]
                  md:opacity-0 md:group-hover:opacity-100`}>
                {icone}
              </button>
            ))}

            <span className="absolute top-3 right-3 text-[11px] tracking-[0.12em] bg-black/30 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
              {idx + 1}/{fotos.length}
            </span>

            <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {fotos.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{ width: idx === i ? 18 : 6, height: 6, background: idx === i ? '#eae1d4' : 'rgba(234,225,212,0.45)' }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Blocos de informação ───────────────────────────────────── */
function Preco({ preco, desconto }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        {desconto && (
          <span className="text-base md:text-lg text-[#654a2b] line-through"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {formatarPreco(desconto.precoAntes)}
          </span>
        )}
        <span className="text-2xl md:text-4xl font-medium text-[#250000]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {formatarPreco(preco)}
        </span>
        {desconto && (
          <span className="text-[10px] md:text-xs tracking-[0.12em] bg-[#ffc509] text-[#250000] px-2 py-0.5 rounded-sm font-medium">
            −{desconto.percentual}%
          </span>
        )}
      </div>
      <span className="text-xs md:text-sm text-[#654a2b]">
        ou <strong className="text-[#250000] font-medium">{formatarPreco(precoComPix(preco))}</strong> no PIX (5% de desconto)
      </span>
    </div>
  )
}

function Condicao({ condicao }) {
  const cfg = CONDICAO_CONFIG[condicao] ?? CONDICAO_CONFIG['Bom']
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs px-3 py-1 rounded-full font-medium"
        style={{ background: cfg.bg, color: cfg.cor }}>
        {condicao}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-[#654a2b]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#654a2b" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Verificado
      </span>
    </div>
  )
}

function Medidas({ medidas }) {
  const linhas = [
    ['Ombro', medidas.ombro], ['Busto', medidas.busto], ['Cintura', medidas.cintura],
    ['Comprimento', medidas.comprimento], ['Manga', medidas.manga],
  ].filter(([, v]) => v != null)

  if (linhas.length === 0) return null

  return (
    <div>
      <h2 className="text-xs tracking-[0.18em] text-[#654a2b] uppercase mb-2">Medidas</h2>
      <div className="border border-[#d6c8b3] rounded-sm overflow-hidden">
        {linhas.map(([rotulo, valor], i) => (
          <div key={rotulo}
            className={`flex justify-between items-center px-3 py-2.5 ${i < linhas.length - 1 ? 'border-b border-[#d6c8b3]' : ''}`}
            style={{ background: i % 2 === 0 ? '#eae1d4' : '#f2ead9' }}>
            <span className="text-xs text-[#654a2b]">{rotulo}</span>
            <span className="text-sm text-[#250000]">{valor} cm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BotoesCompra({ produto, fixo }) {
  const { toggle, isFavorito } = useFavoritos()
  const { adicionar, temNoCarrinho } = useCart()
  const navigate = useNavigate()
  const favorito = isFavorito(produto.id)
  const noCarrinho = temNoCarrinho(produto.id)

  const aoClicar = () => {
    if (noCarrinho) { navigate('/carrinho'); return }
    adicionar({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      tamanho: produto.tamanho,
      imagem: produto.fotos?.find(f => !f.startsWith('#')) ?? null,
    })
  }

  return (
    <div className={fixo
      ? 'md:hidden fixed bottom-[60px] inset-x-0 z-40 bg-[#eae1d4] border-t border-[#d6c8b3] px-4 py-3 flex gap-3'
      : 'hidden md:flex gap-3'}>
      <button onClick={() => toggle(produto)}
        className="flex-none w-12 h-12 flex items-center justify-center border border-[#d6c8b3] rounded-sm hover:border-[#654a2b] transition-colors"
        aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar'}>
        <svg width="20" height="20" viewBox="0 0 24 24"
          fill={favorito ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button onClick={aoClicar}
        className={`flex-1 h-12 text-xs tracking-[0.16em] rounded-sm transition-opacity hover:opacity-90 ${noCarrinho ? 'bg-[#ffc509] text-[#250000] font-medium' : 'bg-[#250000] text-[#eae1d4]'}`}>
        {noCarrinho ? 'NO CARRINHO — VER' : 'ADICIONAR AO CARRINHO'}
      </button>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
function mapear(p) {
  return {
    id: p.id,
    nome: p.name,
    marca: p.categoria ?? '',
    tags: [p.categoria, p.gender, p.size ? `Tam. ${p.size}` : null].filter(Boolean),
    preco: Number(p.price),
    desconto: calcularDesconto(p.price, p.original_price),
    tamanho: p.size ?? null,
    medidas: p.medidas ?? null,
    condicao: CONDICAO_LABEL[p.condition] ?? 'Bom',
    descricao: p.description ?? '',
    fotos: p.images?.length ? p.images : CORES_SEM_FOTO,
  }
}

export default function Produto() {
  const { id } = useParams()
  const [produto, setProduto] = useState(null)
  const [similares, setSimilares] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    buscarProduto(id)
      .then(({ produto: p, similares: s }) => {
        setProduto(mapear(p))
        setSimilares(s.map(normalizarProduto))
      })
      .catch(err => {
        console.warn('API indisponível, usando peça de exemplo:', err.message)
        setProduto(PRODUTO_EXEMPLO)
        setSimilares([])
      })
      .finally(() => setCarregando(false))
  }, [id])

  if (carregando || !produto) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="text-xs tracking-[0.2em] text-[#654a2b] uppercase">Carregando...</span>
      </div>
    )
  }

  return (
    <>
      <div className={`${CONTAINER} py-3 md:py-6`}>
        <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-xs text-[#654a2b] hover:text-[#250000] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Catálogo
        </Link>
      </div>

      {/* Mobile empilha; desktop divide em duas colunas com a galeria fixa */}
      <div className={`${CONTAINER} md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-start`}>
        <div className="-mx-4 md:mx-0 md:sticky md:top-24">
          <Galeria fotos={produto.fotos} nome={produto.nome} />
        </div>

        <div className="pt-5 md:pt-0 flex flex-col gap-4 md:gap-6 pb-28 md:pb-0">
          <div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {produto.tags.map(t => (
                <span key={t} className="text-[10px] tracking-[0.14em] text-[#654a2b] border border-[#d6c8b3] px-2 py-0.5 rounded-full capitalize">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-4xl font-medium text-[#250000] leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {produto.nome}
            </h1>
            {produto.marca && <p className="text-xs md:text-sm text-[#654a2b] mt-0.5">{produto.marca}</p>}
          </div>

          <div className="border-t border-[#d6c8b3]" />
          <Preco preco={produto.preco} desconto={produto.desconto} />

          {produto.tamanho && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#654a2b]">Tamanho</span>
              <span className="min-w-9 h-9 px-2 flex items-center justify-center border border-[#250000] text-sm font-medium text-[#250000]">
                {produto.tamanho}
              </span>
            </div>
          )}

          <Condicao condicao={produto.condicao} />

          <BotoesCompra produto={produto} />

          {produto.medidas && <><div className="border-t border-[#d6c8b3]" /><Medidas medidas={produto.medidas} /></>}

          {produto.descricao && (
            <>
              <div className="border-t border-[#d6c8b3]" />
              <div>
                <h2 className="text-xs tracking-[0.18em] text-[#654a2b] uppercase mb-2">Sobre a peça</h2>
                <p className="text-sm md:text-base text-[#250000] leading-relaxed">{produto.descricao}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {similares.length > 0 && (
        <section className={`${CONTAINER} pt-10 md:pt-20 pb-10 md:pb-20`}>
          <h2 className="text-xs md:text-sm tracking-[0.18em] text-[#654a2b] uppercase mb-3 md:mb-6">
            Peças similares
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {similares.slice(0, 4).map(p => <ProductCard key={p.id} produto={p} />)}
          </div>
        </section>
      )}

      <BotoesCompra produto={produto} fixo />
    </>
  )
}
