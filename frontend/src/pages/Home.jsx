import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarProdutos } from '../services/api'
import { normalizarProduto, formatarPreco } from '../utils/preco'
import ProductCard from '../components/ProductCard'
import Revelar from '../components/Revelar'

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
   Não é carrossel: é a capa do acervo. A peça em destaque quebra a
   grade e invade a tipografia, como colagem de fanzine.            */
function Hero({ pecas, total }) {
  const destaque = pecas.find(p => p.imagem) ?? pecas[0]

  return (
    <section className="relative overflow-hidden bg-[#250000] text-[#eae1d4] grao">
      <div className={`${CONTAINER} relative pt-9 pb-14 md:pt-14 md:pb-20`}>
        <div className="md:grid md:grid-cols-12 md:gap-8 md:items-center">

          {/* Coluna tipográfica */}
          <div className="md:col-span-7 relative z-10">
            <div className="surgir flex items-center gap-3 mb-6 md:mb-10" style={{ animationDelay: '80ms' }}>
              <span className="text-[10px] tracking-[0.32em] opacity-60">ACERVO</span>
              <span className="h-px w-10 bg-[#eae1d4]/30 esticar" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] tracking-[0.32em] text-[#ffc509]">
                {total > 0 ? `${String(total).padStart(2, '0')} PEÇAS` : 'EM CURADORIA'}
              </span>
            </div>

            <h1 className="surgir font-black italic tracking-[-0.05em] leading-[0.86] mb-5 md:mb-7"
              style={{ fontSize: 'clamp(2.75rem, 7.5vw, 5.5rem)', animationDelay: '160ms' }}>
              UMA PEÇA.<br />
              <span className="text-[#ffc509]">UMA CHANCE.</span>
            </h1>

            <p className="surgir text-sm md:text-base max-w-sm opacity-70 leading-relaxed mb-7 md:mb-8"
              style={{ animationDelay: '280ms' }}>
              Brechó de peças únicas, garimpadas uma a uma.
              Cada item existe em uma só unidade — o que sai, não volta.
            </p>

            <div className="surgir flex items-center gap-4" style={{ animationDelay: '380ms' }}>
              <Link to="/catalogo"
                className="group inline-flex items-center gap-3 bg-[#eae1d4] text-[#250000] px-6 md:px-8 py-3 md:py-4
                  text-xs tracking-[0.18em] font-medium hover:bg-[#ffc509] transition-colors duration-300">
                VER O ACERVO
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Peça em destaque — invade a coluna do texto no desktop */}
          {destaque && (
            <div className="md:col-span-5 relative mt-10 md:mt-0 md:-ml-12 lg:-ml-20">
              <Link to={`/produto/${destaque.id}`}
                className="surgir block relative group" style={{ animationDelay: '460ms' }}>
                <div className="relative overflow-hidden bg-[#432d1c]" style={{ aspectRatio: '3/4' }}>
                  {destaque.imagem && (
                    <img src={destaque.imagem} alt={destaque.nome}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  )}
                </div>

                {/* Etiqueta de arquivo, deslocada para fora da foto */}
                <div className="absolute -bottom-4 -left-3 md:-left-6 bg-[#eae1d4] text-[#250000] px-4 py-2.5 max-w-[75%]">
                  <p className="text-[9px] tracking-[0.28em] text-[#654a2b] mb-0.5">EM DESTAQUE</p>
                  <p className="text-sm leading-tight truncate">{destaque.nome}</p>
                  <p className="text-sm font-medium mt-0.5">
                    {destaque.desconto && (
                      <span className="line-through text-[#654a2b] text-xs mr-1.5">
                        {formatarPreco(destaque.desconto.precoAntes)}
                      </span>
                    )}
                    {formatarPreco(destaque.preco)}
                  </p>
                </div>

                {destaque.desconto && (
                  <span className="absolute top-3 right-3 bg-[#ffc509] text-[#250000] text-[10px] tracking-[0.15em] font-medium px-2.5 py-1">
                    −{destaque.desconto.percentual}%
                  </span>
                )}
              </Link>
            </div>
          )}
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] tracking-[0.2em] text-[#654a2b]/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="h-px flex-1 bg-[#250000]/10" />
              </div>
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
      <Indice />
      <Destaques pecas={pecas} />
      <Manifesto />
      <Ticker reverse />
    </>
  )
}
