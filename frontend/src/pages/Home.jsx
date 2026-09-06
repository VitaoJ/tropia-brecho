import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarProdutos } from '../services/api'
import { normalizarProduto, formatarPreco } from '../utils/preco'
import ProductCard from '../components/ProductCard'
import Revelar from '../components/Revelar'
import { otimizar, fontes, MELHOR } from '../utils/imagem'
import Avaliacoes from '../components/Avaliacoes'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/* ─── Ticker ─────────────────────────────────────────────────── */
function Ticker({ reverse = false, dark = false }) {
  const texto = dark
    ? 'SUSTENTABILIDADE — MODA CIRCULAR — PEÇAS ÚNICAS — SEGUNDA MÃO — ESTILO ATEMPORAL — '
    : 'FRETE PARA TODO BRASIL — PEÇAS SELECIONADAS — MODA CONSCIENTE — VINTAGE & CLÁSSICO — '
  return (
    <div className={`overflow-hidden py-2 md:py-2.5 border-y ${
      dark
        ? 'bg-[#250000] text-[#eae1d4] border-[#250000]'
        : 'bg-transparent text-[#654a2b] border-[#d6c8b3]'
    }`}>
      <div className={`whitespace-nowrap text-[10px] md:text-[11px] tracking-[0.22em] ${reverse ? 'ticker-animate-reverse' : 'ticker-animate'}`}>
        {texto.repeat(8)}
      </div>
    </div>
  )
}
/* ─── Hero ───────────────────────────────────────────────────────
   Não é carrossel: é a capa do acervo. A foto ocupa a faixa inteira e
   a tipografia se apoia nela, como capa de revista.                */

// Foto de capa. Fica fora do banco de propósito: é peça de direção de arte,
// não item de estoque, e trocá-la é decisão de campanha e não de catálogo.
const CAPA = 'https://res.cloudinary.com/mvsuquav/image/upload/v1788724160/tropia/site/hero-vintage.jpg'

// A seção em destaque na capa. Trocar aqui muda a chamada da home inteira.
const DESTAQUE = { nome: 'Masculino', genero: 'masculino', chamada: 'Alfaiataria, malha e jeans garimpados' }

function Hero({ pecas, total }) {
  // Quantas peças a seção em destaque tem, e uma foto dela para o cartão.
  // Sem foto o cartão se vira sozinho — a maioria das peças ainda não tem.
  const daSecao = pecas.filter(p => p.genero === DESTAQUE.genero)
  const fotoDaSecao = daSecao.find(p => p.imagem)?.imagem ?? null

  return (
    <section className="relative overflow-hidden bg-[#250000] text-[#eae1d4]">
      {/* Foto de fundo cobrindo a faixa toda */}
      <div className="absolute inset-0">
        <img
          src={otimizar(CAPA, 1400, MELHOR)}
          srcSet={fontes(CAPA, [700, 1000, 1400, 1800, 2400], MELHOR)}
          sizes="100vw"
          alt="Peça do acervo Tropia vestida na rua"
          fetchpriority="high"
          /* O recorte favorece o tronco: é onde a peça aparece, e é o que
             muda quando a foto de capa for trocada por outra. */
          className="w-full h-full object-cover object-[50%_38%]" />

        {/* Escurece só onde o texto pousa, para a foto não perder o resto */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#250000]/85 via-[#250000]/25 to-[#250000]/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#250000]/60 to-transparent md:to-40%" />
      </div>

      <div className={`${CONTAINER} relative min-h-[70vh] md:min-h-[72vh] flex flex-col justify-end
        pt-24 pb-10 md:pt-32 md:pb-14`}>
        <div className="md:grid md:grid-cols-12 md:gap-8 md:items-end">

          {/* Coluna tipográfica */}
          <div className="md:col-span-7 relative z-10">
            <div className="surgir flex items-center gap-3 mb-4 md:mb-5" style={{ animationDelay: '80ms' }}>
              <span className="text-[10px] md:text-[11px] tracking-[0.32em] italic opacity-80">ACERVO</span>
              <span className="h-px w-10 bg-[#eae1d4]/40 esticar" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] md:text-[11px] tracking-[0.32em] italic">
                {total > 0 ? `${String(total).padStart(2, '0')} PEÇAS` : 'EM CURADORIA'}
              </span>
            </div>

            <h1 className="surgir font-black italic tracking-[-0.055em] leading-[0.82] mb-5"
              style={{ fontSize: 'clamp(3.5rem, 13vw, 9rem)', animationDelay: '160ms' }}>
              vintage
            </h1>

            {/* O cartão leva para uma seção só; o acervo inteiro precisa de
                porta própria, senão a home tem uma saída só. */}
            <Link to="/catalogo"
              className="surgir inline-flex items-center gap-2 text-[11px] tracking-[0.18em]
                border-b border-[#eae1d4]/40 pb-1 hover:border-[#ffc509] hover:text-[#ffc509] transition-colors"
              style={{ animationDelay: '380ms' }}>
              VER O ACERVO
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Seção em destaque */}
          <div className="md:col-span-5 mt-8 md:mt-0 relative z-10 flex md:justify-end">
            <Link to={`/catalogo?genero=${DESTAQUE.genero}`}
              className="surgir group block w-full max-w-[300px]" style={{ animationDelay: '460ms' }}>
              {fotoDaSecao && (
                <div className="bg-[#eae1d4] overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <img src={otimizar(fotoDaSecao, 500)}
                    srcSet={fontes(fotoDaSecao, [300, 400, 500, 650])}
                    sizes="(min-width: 768px) 25vw, 80vw"
                    alt="" loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
              )}
              <div className="bg-[#eae1d4] text-[#250000] px-4 py-3">
                <p className="text-[9px] tracking-[0.28em] text-[#654a2b] mb-1">EM DESTAQUE</p>
                <p className="text-lg leading-tight font-medium">{DESTAQUE.nome}</p>
                <p className="text-[11px] text-[#654a2b] mt-0.5 leading-snug">{DESTAQUE.chamada}</p>
                <p className="text-[11px] text-[#250000] mt-2 inline-flex items-center gap-1.5">
                  {daSecao.length > 0
                    ? `${daSecao.length} ${daSecao.length === 1 ? 'peça' : 'peças'}`
                    : 'ver seção'}
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                </p>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

/* ─── Índice de categorias ───────────────────────────────────────
   Lista de sumário de revista, não quatro caixas coloridas.        */
const CATEGORIAS = [
  { nome: 'Feminino',   slug: 'feminino',   nota: 'Vestidos, blusas, alfaiataria' },
  { nome: 'Masculino',  slug: 'masculino',  nota: 'Camisas, jaquetas, calças' },
  { nome: 'Calçados',   slug: 'calcados',   nota: 'Tênis, botas, sandálias' },
  { nome: 'Acessórios', slug: 'acessorios', nota: 'Bolsas, cintos, chapéus' },
]

function Indice() {
  return (
    <section className={`${CONTAINER} pt-14 md:pt-24`}>
      <Revelar>
        <div className="flex items-baseline justify-between mb-6 md:mb-10">
          <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">Índice</h2>
          <span className="text-[10px] tracking-[0.2em] text-[#654a2b]/60">04 SEÇÕES</span>
        </div>
      </Revelar>

      <div className="border-t border-[#250000]/15">
        {CATEGORIAS.map((c, i) => (
          <Revelar key={c.slug} atraso={i * 70}>
            <Link to={`/catalogo?categoria=${c.slug}`}
              className="indice-item group relative flex items-center gap-4 md:gap-8 py-5 md:py-7
                border-b border-[#250000]/15 overflow-hidden">
              {/* Preenchimento que sobe no hover */}
              <span className="indice-fundo absolute inset-0 bg-[#250000] -z-0" />

              <span className="relative z-10 text-[10px] md:text-xs tracking-[0.2em] text-[#654a2b] group-hover:text-[#ffc509] transition-colors duration-300 flex-none w-8">
                {String(i + 1).padStart(2, '0')}
              </span>

              <span className="relative z-10 font-black italic tracking-[-0.04em] leading-none
                text-[#250000] group-hover:text-[#eae1d4] transition-colors duration-300"
                style={{ fontSize: 'clamp(1.75rem, 6vw, 3.5rem)' }}>
                {c.nome}
              </span>

              <span className="relative z-10 hidden lg:block text-xs text-[#654a2b] group-hover:text-[#eae1d4]/60 transition-colors duration-300">
                {c.nota}
              </span>

              <span className="indice-seta relative z-10 ml-auto text-xl md:text-2xl text-[#250000] group-hover:text-[#ffc509] transition-colors duration-300">
                →
              </span>
            </Link>
          </Revelar>
        ))}
      </div>
    </section>
  )
}

/* ─── Manifesto ──────────────────────────────────────────────── */
function Manifesto() {
  return (
    <section className="mt-14 md:mt-24 bg-[#432d1c] text-[#eae1d4] grao relative overflow-hidden">
      <div className={`${CONTAINER} py-14 md:py-24`}>
        <Revelar>
          <p className="font-black italic tracking-[-0.045em] leading-[0.95] max-w-3xl"
            style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.75rem)' }}>
            Toda peça daqui já teve
            uma história. <span className="text-[#ffc509]">A próxima é a sua.</span>
          </p>
        </Revelar>
        <Revelar atraso={140}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-10 md:mt-16 pt-8 border-t border-[#eae1d4]/15">
            {[
              ['Curadoria', 'Cada peça é escolhida e revisada à mão'],
              ['Peça única', 'Uma unidade de cada — sem reposição'],
              ['Moda circular', 'Roupa que volta a circular em vez de virar lixo'],
              ['Brasil inteiro', 'Frete para todo o país'],
            ].map(([titulo, nota]) => (
              <div key={titulo}>
                <h3 className="text-[10px] tracking-[0.24em] text-[#ffc509] uppercase mb-2">{titulo}</h3>
                <p className="text-xs md:text-sm opacity-60 leading-relaxed">{nota}</p>
              </div>
            ))}
          </div>
        </Revelar>
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

function Destaques({ pecas }) {
  const lista = pecas.length > 0 ? pecas.slice(0, 8) : FALLBACK

  return (
    <section className={`${CONTAINER} pt-14 md:pt-24 pb-14 md:pb-24`}>
      <Revelar>
        <div className="flex items-baseline justify-between mb-6 md:mb-10">
          <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">
            Últimas chegadas
          </h2>
          <Link to="/catalogo"
            className="group text-[11px] md:text-xs text-[#654a2b] hover:text-[#250000] transition-colors inline-flex items-center gap-2">
            ver tudo
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </Revelar>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-6 md:gap-y-12">
        {lista.map((p, i) => (
          <Revelar key={p.id} atraso={(i % 4) * 70}>
            {/* Alterna a altura no desktop para a grade não ficar plana */}
            <div className={i % 2 === 1 ? 'lg:mt-10' : ''}>
              <ProductCard produto={p} />
            </div>
          </Revelar>
        ))}
      </div>
    </section>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
export default function Home() {
  const [pecas, setPecas] = useState([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    listarProdutos({ limite: 100 })
      .then(({ produtos }) => {
        setPecas(produtos.map(normalizarProduto))
        setTotal(produtos.length)
      })
      .catch(err => console.warn('API indisponível, usando exemplos:', err.message))
  }, [])

  return (
    <>
      <Hero pecas={pecas} total={total} />
      <Ticker dark />
      <Avaliacoes />
      <Indice />
      <Destaques pecas={pecas} />
      <Manifesto />
      <Ticker reverse />
    </>
  )
}
