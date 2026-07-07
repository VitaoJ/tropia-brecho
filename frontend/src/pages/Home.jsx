import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import { listarProdutos, formatarPreco } from '../services/api'
import logoSimbolo from '../assets/logo-simbolo.svg'
import logoTexto from '../assets/logo-texto.svg'

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-[#eae1d4] border-b border-[#d6c8b3]">
      <img src={logoSimbolo} alt="Tropia símbolo" className="h-8 w-8 object-contain" />
      <img src={logoTexto} alt="Tropia" className="h-7 object-contain" />
      <div className="flex items-center gap-4">
        <button aria-label="Buscar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button aria-label="Carrinho" className="relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </button>
      </div>
    </nav>
  )
}

/* ─── Ticker ─────────────────────────────────────────────────── */
function Ticker({ reverse = false, dark = false }) {
  const text = 'PEÇAS ÚNICAS • MODA SUSTENTÁVEL • BRECHÓ ONLINE • CURADORIA EXCLUSIVA • '
  const repeated = text.repeat(6)
  return (
    <div className={`overflow-hidden py-2 ${dark ? 'bg-[#250000] text-[#eae1d4]' : 'bg-[#e0d4c2] text-[#250000]'}`}>
      <div className={`whitespace-nowrap text-[10px] tracking-[0.18em] font-medium ${reverse ? 'ticker-animate-reverse' : 'ticker-animate'}`}
        style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {repeated}
      </div>
    </div>
  )
}

/* ─── Hero Carousel ──────────────────────────────────────────── */
const SLIDES = [
  { bg: '#250000', escuro: true,  label: 'NOVO', title: 'Verão\nSustentável', sub: 'Peças selecionadas para o calor', cta: 'Ver coleção' },
  { bg: '#bfa887', escuro: false, label: 'DESTAQUE', title: 'Feminino\nVintage', sub: 'Anos 70 e 80 repaginados', cta: 'Explorar' },
  { bg: '#432d1c', escuro: true,  label: 'ESPECIAL', title: 'Calçados\nÚnicos', sub: 'Encontre o par perfeito', cta: 'Ver calçados' },
]

function HeroCarousel() {
  const [cur, setCur] = useState(0)
  const timerRef = useRef(null)

  const goTo = (i) => setCur(i)

  useEffect(() => {
    timerRef.current = setInterval(() => setCur(p => (p + 1) % SLIDES.length), 3800)
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <div className="relative overflow-hidden" style={{ height: '62vw', maxHeight: 460, minHeight: 260 }}>
      {/* Track */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${cur * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <div key={i} className="relative flex-none w-full h-full flex flex-col justify-end pb-8 px-5"
            style={{ background: s.bg }}>
            <span className="text-[10px] tracking-[0.22em] mb-2 opacity-70"
              style={{ color: s.escuro ? '#eae1d4' : '#250000', fontFamily: "'DM Sans', sans-serif" }}>
              {s.label}
            </span>
            <h2 className="text-4xl font-medium leading-tight whitespace-pre-line mb-2"
              style={{ color: s.escuro ? '#eae1d4' : '#250000', fontFamily: "'Cormorant Garamond', serif" }}>
              {s.title}
            </h2>
            <p className="text-xs mb-5 opacity-70"
              style={{ color: s.escuro ? '#eae1d4' : '#250000', fontFamily: "'DM Sans', sans-serif" }}>
              {s.sub}
            </p>
            <button
              className="self-start text-xs tracking-[0.14em] px-5 py-2.5 border"
              style={{
                color: s.escuro ? '#250000' : '#eae1d4',
                background: s.escuro ? '#eae1d4' : '#250000',
                borderColor: s.escuro ? '#eae1d4' : '#250000',
                fontFamily: "'DM Sans', sans-serif"
              }}>
              {s.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: cur === i ? 20 : 6, height: 6,
              background: SLIDES[cur].escuro ? (cur === i ? '#eae1d4' : 'rgba(234,225,212,0.4)') : (cur === i ? '#250000' : 'rgba(37,0,0,0.3)')
            }} />
        ))}
      </div>
    </div>
  )
}

/* ─── Categorias ─────────────────────────────────────────────── */
const CATEGORIAS = [
  { nome: 'Feminino', bg: '#d6c8b3' },
  { nome: 'Masculino', bg: '#c4ae90' },
  { nome: 'Calçados', bg: '#a98f6e' },
  { nome: 'Acessórios', bg: '#e0d4c2' },
]

function SecaoCategorias() {
  return (
    <section className="px-4 pt-6 pb-2">
      <h3 className="text-xs tracking-[0.2em] text-[#654a2b] mb-3 uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Categorias
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIAS.map((c) => (
          <button key={c.nome}
            className="rounded-sm flex items-end justify-start px-4 py-5"
            style={{ background: c.bg, minHeight: 100 }}>
            <span className="text-base font-medium text-[#250000]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem' }}>
              {c.nome}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ─── Destaques ──────────────────────────────────────────────── */
// Fallback exibido enquanto a API não responde (ou está fora do ar)
const DESTAQUES_FALLBACK = [
  { id: 1, nome: 'Blusa Vintage', tamanho: 'M', preco: 'R$ 49', novo: true },
  { id: 2, nome: 'Calça Wide Leg', tamanho: '38', preco: 'R$ 89', novo: false },
  { id: 3, nome: 'Vestido Floral', tamanho: 'P', preco: 'R$ 65', novo: true },
  { id: 4, nome: 'Jaqueta Jeans', tamanho: 'G', preco: 'R$ 120', novo: false },
]

// Peça é "NOVO" se entrou há menos de 14 dias
const ehNovo = (createdAt) =>
  createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000

function SecaoDestaques() {
  const navigate = useNavigate()
  const { toggle, isFavorito } = useFavoritos()
  const [destaques, setDestaques] = useState(DESTAQUES_FALLBACK)

  useEffect(() => {
    listarProdutos({ limite: 4 })
      .then(({ produtos }) => {
        if (produtos.length === 0) return
        setDestaques(produtos.map(p => ({
          id: p.id,
          nome: p.name,
          tamanho: p.size ?? '—',
          preco: formatarPreco(p.price),
          novo: ehNovo(p.created_at),
          imagem: p.images?.[0] ?? null,
        })))
      })
      .catch(err => console.warn('API indisponível, usando destaques de exemplo:', err.message))
  }, [])
  return (
    <section className="px-4 pt-6 pb-24">
      <h3 className="text-xs tracking-[0.2em] text-[#654a2b] mb-3 uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        Destaques
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {destaques.map((p) => (
          <div key={p.id} className="group cursor-pointer" onClick={() => navigate(`/produto/${p.id}`)}>
            <div className="relative rounded-sm mb-2 overflow-hidden"
              style={{ aspectRatio: '3/4', background: '#d6c8b3' }}>
              {p.imagem && (
                <img src={p.imagem} alt={p.nome} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {p.novo && (
                <span className="absolute top-2 left-2 text-[9px] tracking-[0.15em] bg-[#ffc509] text-[#250000] px-2 py-0.5 font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  NOVO
                </span>
              )}
              <button className="absolute top-2 right-2" aria-label="Favoritar"
                onClick={(e) => { e.stopPropagation(); toggle(p) }}>
                <svg width="16" height="16" viewBox="0 0 24 24"
                  fill={isFavorito(p.id) ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
            <p className="text-sm leading-tight text-[#250000]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem' }}>
              {p.nome}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-[#654a2b]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tam. {p.tamanho}
              </span>
              <span className="text-xs font-medium text-[#250000]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {p.preco}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Bottom Nav ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Home',      path: '/',          icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { label: 'Catálogo',  path: '/catalogo',  icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { label: 'Favoritos', path: '/favoritos', icon: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { label: 'Carrinho',  path: '/carrinho',  icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
]

function BottomNav() {
  const navigate = useNavigate()
  const currentPath = window.location.pathname
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#eae1d4] border-t border-[#d6c8b3]"
      style={{ height: 60, maxWidth: 500, margin: '0 auto', left: 'inherit', right: 'inherit', width: '100%' }}>
      {NAV_ITEMS.map((item) => {
        const active = currentPath === item.path
        return (
          <button key={item.label} onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-0.5 pt-2 pb-1 px-3">
            {item.icon(active)}
            <span className="text-[9px] tracking-[0.1em]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: active ? '#250000' : '#654a2b' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/* ─── Home ───────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#eae1d4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />
      <main className="pt-14">
        <Ticker dark />
        <HeroCarousel />
        <Ticker reverse />
        <SecaoCategorias />
        <SecaoDestaques />
      </main>
      <BottomNav />
    </div>
  )
}
