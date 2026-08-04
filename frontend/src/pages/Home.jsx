import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { listarProdutos } from '../services/api'
import { normalizarProduto } from '../utils/preco'
import ProductCard from '../components/ProductCard'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/* ─── Ticker ─────────────────────────────────────────────────── */
function Ticker({ reverse = false, dark = false }) {
  const texto = dark
    ? 'SUSTENTABILIDADE • MODA CIRCULAR • PEÇAS ÚNICAS • SEGUNDA MÃO • ESTILO ATEMPORAL • '
    : 'FRETE PARA TODO BRASIL • PEÇAS SELECIONADAS • MODA CONSCIENTE • VINTAGE & CLÁSSICO • '
  return (
    <div className={`overflow-hidden py-2 md:py-2.5 ${dark ? 'bg-[#250000] text-[#eae1d4]' : 'bg-[#e0d4c2] text-[#250000]'}`}>
      <div className={`whitespace-nowrap text-[10px] md:text-[11px] tracking-[0.18em] font-medium ${reverse ? 'ticker-animate-reverse' : 'ticker-animate'}`}>
        {texto.repeat(8)}
      </div>
    </div>
  )
}

/* ─── Hero ───────────────────────────────────────────────────── */
const SLIDES = [
  { bg: '#250000', escuro: true,  label: 'NOVO',     titulo: 'Verão\nSustentável', sub: 'Peças selecionadas para o calor', cta: 'Ver coleção',  destino: '/catalogo?categoria=feminino' },
  { bg: '#bfa887', escuro: false, label: 'DESTAQUE', titulo: 'Feminino\nVintage',  sub: 'Anos 70 e 80 repaginados',        cta: 'Explorar',     destino: '/catalogo?categoria=masculino' },
  { bg: '#432d1c', escuro: true,  label: 'ESPECIAL', titulo: 'Calçados\nÚnicos',   sub: 'Encontre o par perfeito',         cta: 'Ver calçados', destino: '/catalogo?categoria=calcados' },
]

function Hero() {
  const [atual, setAtual] = useState(0)
  const timer = useRef(null)

  const irPara = (i) => {
    setAtual(i)
    clearInterval(timer.current)
    timer.current = setInterval(() => setAtual(p => (p + 1) % SLIDES.length), 5000)
  }

  useEffect(() => {
    timer.current = setInterval(() => setAtual(p => (p + 1) % SLIDES.length), 5000)
    return () => clearInterval(timer.current)
  }, [])

  return (
    <section className="relative overflow-hidden h-[62vw] max-h-[420px] min-h-[280px] md:h-[calc(100vh-5rem)] md:max-h-[560px]">
      <div className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${atual * 100}%)` }}>
        {SLIDES.map((s, i) => (
          <div key={i} className="flex-none w-full h-full flex items-end" style={{ background: s.bg }}>
            <div className={`${CONTAINER} w-full pb-10 md:pb-20`}>
              <div className="md:max-w-lg" style={{ color: s.escuro ? '#eae1d4' : '#250000' }}>
                <span className="block text-[10px] md:text-xs tracking-[0.28em] mb-2 md:mb-4 opacity-70">
                  {s.label}
                </span>
                {/* Teste: peso máximo da Libre Franklin, itálico e bem apertado */}
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black italic tracking-[-0.045em] leading-[1] whitespace-pre-line mb-2 md:mb-4">
                  {s.titulo}
                </h2>
                <p className="text-xs md:text-base mb-5 md:mb-8 opacity-70">{s.sub}</p>
                <Link to={s.destino}
                  className="inline-block text-xs md:text-sm tracking-[0.14em] px-5 md:px-8 py-2.5 md:py-3.5 transition-opacity hover:opacity-80"
                  style={{
                    color: s.escuro ? '#250000' : '#eae1d4',
                    background: s.escuro ? '#eae1d4' : '#250000',
                  }}>
                  {s.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`absolute bottom-4 md:bottom-8 inset-x-0 ${CONTAINER} flex justify-end gap-1.5`}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => irPara(i)} aria-label={`Slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width: atual === i ? 24 : 7, height: 7,
              background: SLIDES[atual].escuro
                ? (atual === i ? '#eae1d4' : 'rgba(234,225,212,0.4)')
                : (atual === i ? '#250000' : 'rgba(37,0,0,0.3)'),
            }} />
        ))}
      </div>
    </section>
  )
}

/* ─── Categorias ─────────────────────────────────────────────── */
const CATEGORIAS = [
  { nome: 'Feminino',   slug: 'feminino',   bg: '#d6c8b3' },
  { nome: 'Masculino',  slug: 'masculino',  bg: '#c4ae90' },
  { nome: 'Calçados',   slug: 'calcados',   bg: '#a98f6e' },
  { nome: 'Acessórios', slug: 'acessorios', bg: '#e0d4c2' },
]

function Categorias() {
  return (
    <section className={`${CONTAINER} pt-8 md:pt-16`}>
      <h2 className="text-xs md:text-sm tracking-[0.2em] text-[#654a2b] mb-3 md:mb-6 uppercase">
        Categorias
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {CATEGORIAS.map(c => (
          <Link key={c.slug} to={`/catalogo?categoria=${c.slug}`}
            className="rounded-sm flex items-end px-4 md:px-6 py-5 md:py-8 min-h-[100px] md:min-h-[200px] transition-opacity hover:opacity-90"
            style={{ background: c.bg }}>
            <span className="text-[1.1rem] md:text-2xl font-medium text-[#250000]">
              {c.nome}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ─── Destaques ──────────────────────────────────────────────── */
const FALLBACK = [
  { id: 1, nome: 'Blusa Vintage',  tamanho: 'M',  preco: 49,  novo: true },
  { id: 2, nome: 'Calça Wide Leg', tamanho: '38', preco: 89,  novo: false },
  { id: 3, nome: 'Vestido Floral', tamanho: 'P',  preco: 65,  novo: true },
  { id: 4, nome: 'Jaqueta Jeans',  tamanho: 'G',  preco: 120, novo: false },
]

function Destaques() {
  const [pecas, setPecas] = useState(FALLBACK)

  useEffect(() => {
    listarProdutos({ limite: 8 })
      .then(({ produtos }) => {
        if (produtos.length > 0) setPecas(produtos.map(normalizarProduto))
      })
      .catch(err => console.warn('API indisponível, usando destaques de exemplo:', err.message))
  }, [])

  return (
    <section className={`${CONTAINER} pt-8 md:pt-16 pb-10 md:pb-20`}>
      <div className="flex items-baseline justify-between mb-3 md:mb-6">
        <h2 className="text-xs md:text-sm tracking-[0.2em] text-[#654a2b] uppercase">Destaques</h2>
        <Link to="/catalogo" className="text-[11px] md:text-xs text-[#654a2b] hover:text-[#250000] underline underline-offset-4">
          ver tudo
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {pecas.map(p => <ProductCard key={p.id} produto={p} />)}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Ticker dark />
      <Hero />
      <Ticker reverse />
      <Categorias />
      <Destaques />
    </>
  )
}
