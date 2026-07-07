import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'

/* ─── Mock data (substituir por fetch /api/produtos/:id) ─────── */
const PRODUTO_MOCK = {
  id: 1,
  nome: 'Vestido Midi Floral',
  marca: 'Referência anos 80',
  tags: ['Feminino', 'Vintage', 'Floral'],
  preco: 98.00,
  tamanho: 'M',
  medidas: { ombro: 38, busto: 88, cintura: 72, comprimento: 110, manga: null },
  condicao: 'Ótimo',
  descricao: 'Vestido midi com estampa floral em tons terrosos. Tecido leve, ideal para dias quentes. Decote V e manga curta bufante. Peça única selecionada com atenção à qualidade.',
  fotos: ['#c4ae90', '#a98f6e', '#d6c8b3'],
  categoria: 'Feminino',
}

const SIMILARES_MOCK = [
  { id: 2, nome: 'Blusa Floral', tamanho: 'P', preco: 49, cor: '#c4ae90' },
  { id: 3, nome: 'Saia Midi', tamanho: 'M', preco: 65, cor: '#a98f6e' },
  { id: 4, nome: 'Vestido Linho', tamanho: 'G', preco: 120, cor: '#d6c8b3' },
  { id: 5, nome: 'Blusa Estampada', tamanho: 'M', preco: 42, cor: '#bfa887' },
]

const CONDICAO_CONFIG = {
  'Ótimo':   { cor: '#2d6a4f', bg: '#d8f3dc' },
  'Bom':     { cor: '#b57e10', bg: '#fff3cd' },
  'Regular': { cor: '#c44b00', bg: '#ffe0cc' },
}

/* ─── Carrossel de fotos ─────────────────────────────────────── */
function CarrosselFotos({ fotos }) {
  const [idx, setIdx] = useState(0)
  const startX = useRef(null)

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (diff > 40 && idx < fotos.length - 1) setIdx(i => i + 1)
    if (diff < -40 && idx > 0) setIdx(i => i - 1)
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Track */}
      <div className="flex h-full transition-transform duration-400 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}>
        {fotos.map((cor, i) => (
          <div key={i} className="flex-none w-full h-full" style={{ background: cor }} />
        ))}
      </div>

      {/* Contador */}
      <span className="absolute top-3 right-3 text-[11px] tracking-[0.12em] bg-black/30 text-white px-2.5 py-1 rounded-full backdrop-blur-sm"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {idx + 1}/{fotos.length}
      </span>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {fotos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all"
            style={{ width: idx === i ? 18 : 6, height: 6, background: idx === i ? '#eae1d4' : 'rgba(234,225,212,0.45)' }} />
        ))}
      </div>
    </div>
  )
}

/* ─── Badge PIX ──────────────────────────────────────────────── */
function BadgePix({ preco }) {
  const precoPix = (preco * 0.95).toFixed(2)
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-2xl font-medium text-[#250000]"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        R$ {preco.toFixed(2).replace('.', ',')}
      </span>
      <span className="text-[10px] tracking-[0.12em] bg-[#ffc509] text-[#250000] px-2 py-0.5 rounded-sm font-medium"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        PIX R$ {precoPix.replace('.', ',')} <span className="opacity-60">(-5%)</span>
      </span>
    </div>
  )
}

/* ─── Condição ───────────────────────────────────────────────── */
function BadgeCondicao({ condicao }) {
  const cfg = CONDICAO_CONFIG[condicao] ?? CONDICAO_CONFIG['Bom']
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs px-3 py-1 rounded-full font-medium"
        style={{ background: cfg.bg, color: cfg.cor, fontFamily: "'DM Sans', sans-serif" }}>
        {condicao}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-[#654a2b]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#654a2b" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Verificado
      </span>
    </div>
  )
}

/* ─── Tabela de medidas ──────────────────────────────────────── */
function TabelaMedidas({ medidas }) {
  const campos = [
    ['Ombro', medidas.ombro],
    ['Busto', medidas.busto],
    ['Cintura', medidas.cintura],
    ['Comprimento', medidas.comprimento],
    ['Manga', medidas.manga],
  ].filter(([, v]) => v !== null)

  return (
    <div>
      <h3 className="text-xs tracking-[0.18em] text-[#654a2b] uppercase mb-2"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Medidas
      </h3>
      <div className="border border-[#d6c8b3] rounded-sm overflow-hidden">
        {campos.map(([label, valor], i) => (
          <div key={label}
            className={`flex justify-between items-center px-3 py-2.5 ${i < campos.length - 1 ? 'border-b border-[#d6c8b3]' : ''}`}
            style={{ background: i % 2 === 0 ? '#eae1d4' : '#f2ead9' }}>
            <span className="text-xs text-[#654a2b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {label}
            </span>
            <span className="text-sm text-[#250000]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {valor} cm
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Similares ──────────────────────────────────────────────── */
function Similares({ items }) {
  return (
    <div className="pb-32">
      <h3 className="text-xs tracking-[0.18em] text-[#654a2b] uppercase mb-3 px-4"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Peças similares
      </h3>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((p) => (
          <div key={p.id} className="flex-none w-36 cursor-pointer">
            <div className="rounded-sm mb-1.5" style={{ aspectRatio: '3/4', background: p.cor }} />
            <p className="text-sm leading-tight text-[#250000] truncate"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem' }}>
              {p.nome}
            </p>
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-[10px] text-[#654a2b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tam. {p.tamanho}
              </span>
              <span className="text-xs text-[#250000]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                R$ {p.preco}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── CTA fixo ───────────────────────────────────────────────── */
function CTAFixo({ produto, onAdd }) {
  const { toggle, isFavorito } = useFavoritos()
  const fav = isFavorito(produto.id)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#eae1d4] border-t border-[#d6c8b3] px-4 py-3 flex gap-3"
      style={{ maxWidth: 500, margin: '0 auto', left: 'inherit', right: 'inherit', width: '100%' }}>
      <button onClick={() => toggle(produto)}
        className="flex-none w-12 h-12 flex items-center justify-center border border-[#d6c8b3] rounded-sm"
        aria-label="Favoritar">
        <svg width="20" height="20" viewBox="0 0 24 24"
          fill={fav ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button onClick={onAdd}
        className="flex-1 h-12 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.16em] rounded-sm active:opacity-80 transition-opacity"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        ADICIONAR AO CARRINHO
      </button>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
export default function Produto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const produto = PRODUTO_MOCK // TODO: fetch /api/produtos/${id}

  const handleAdd = () => {
    // TODO: CartContext.addItem(produto)
    alert('Adicionado ao carrinho!')
  }

  return (
    <div className="min-h-screen bg-[#eae1d4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-14 bg-[#eae1d4] border-b border-[#d6c8b3] gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="flex items-center gap-1.5 text-xs text-[#654a2b]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#654a2b" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Catálogo
        </button>
      </nav>

      <main className="pt-14">
        {/* Carrossel de fotos */}
        <CarrosselFotos fotos={produto.fotos} />

        {/* Info principal */}
        <div className="px-4 pt-5 flex flex-col gap-4">

          {/* Tags + nome + marca */}
          <div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {produto.tags.map(t => (
                <span key={t} className="text-[10px] tracking-[0.14em] text-[#654a2b] border border-[#d6c8b3] px-2 py-0.5 rounded-full"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-medium text-[#250000] leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {produto.nome}
            </h1>
            <p className="text-xs text-[#654a2b] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {produto.marca}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#d6c8b3]" />

          {/* Preço + PIX */}
          <BadgePix preco={produto.preco} />

          {/* Tamanho */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#654a2b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Tamanho</span>
            <span className="w-9 h-9 flex items-center justify-center border border-[#250000] text-sm font-medium text-[#250000]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {produto.tamanho}
            </span>
            <span className="text-xs text-[#654a2b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Busto {produto.medidas.busto} cm
            </span>
          </div>

          {/* Condição */}
          <BadgeCondicao condicao={produto.condicao} />

          {/* Divider */}
          <div className="border-t border-[#d6c8b3]" />

          {/* Tabela de medidas */}
          <TabelaMedidas medidas={produto.medidas} />

          {/* Divider */}
          <div className="border-t border-[#d6c8b3]" />

          {/* Descrição */}
          <div>
            <h3 className="text-xs tracking-[0.18em] text-[#654a2b] uppercase mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Sobre a peça
            </h3>
            <p className="text-sm text-[#250000] leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {produto.descricao}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#d6c8b3]" />
        </div>

        {/* Peças similares */}
        <div className="pt-4">
          <Similares items={SIMILARES_MOCK} />
        </div>
      </main>

      {/* CTA fixo */}
      <CTAFixo produto={produto} onAdd={handleAdd} />
    </div>
  )
}
