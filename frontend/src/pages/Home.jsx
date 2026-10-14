import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarProdutos, obterHome } from '../services/api'
import { normalizarProduto } from '../utils/preco'
import ProductCard from '../components/ProductCard'
import Revelar from '../components/Revelar'
import { otimizar, fontes, MELHOR } from '../utils/imagem'
import Avaliacoes from '../components/Avaliacoes'
import { INSTAGRAM, INSTAGRAM_URL } from '../utils/contato'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/* ─── Ticker ─────────────────────────────────────────────────── */
function Ticker({ reverse = false, dark = false }) {
  const texto = dark
    ? 'MODA CIRCULAR — SUSTENTABILIDADE — PEÇAS DE SEGUNDA MÃO — UPCYCLING — PEÇAS ÚNICAS — CUSTOMIZAÇÃO — '
    : 'FRETE PARA TODO BRASIL — PEÇAS SELECIONADAS — MODA CONSCIENTE — VINTAGE & CLÁSSICO — '
  return (
    // A escura voltou ao #250000 depois de passar pelo verde #01530b: o
    // Murilo pediu o verde, viu no ar e preferiu a cor de antes, que é a do
    // rodapé e a do botão de comprar.
    <div className={`overflow-hidden py-2 md:py-2.5 border-y ${
      dark
        ? 'bg-[#250000] text-[#eae1d4] border-[#250000]'
        : 'bg-transparent text-[#654a2b] border-[#d6c8b3]'
    }`}>
      {/* w-max é o que faz o laço fechar: sem ele a div fica com a largura da
          tela, e o -50% da animação para no meio de uma frase em vez de cair
          numa repetição inteira — a faixa saltava a cada volta e andava a 9
          px/s. Com a largura do conteúdo, metade dele são 4 das 8 cópias. */}
      <div className={`w-max whitespace-nowrap text-[10px] md:text-[11px] tracking-[0.22em] ${reverse ? 'ticker-animate-reverse' : 'ticker-animate'}`}>
        {texto.repeat(8)}
      </div>
    </div>
  )
}
/* ─── Hero ───────────────────────────────────────────────────────
   Não é carrossel: é a capa do acervo. A foto ocupa a faixa inteira e
   a tipografia se apoia nela, como capa de revista.

   O conteúdo vem da coleção que está na capa (painel → Coleções): foto de
   fundo, o nome em letra grande e a peça do cartão. Trocar a capa é trocar
   de coleção, sem mexer no código.                                   */

// Usada só se a API não responder: a home não pode abrir sem capa.
const CAPA_RESERVA = {
  nome: 'vintage', slug: null, chamada: null, total: 0, destaque: null,
  foto: 'https://res.cloudinary.com/mvsuquav/image/upload/v1788724160/tropia/site/hero-vintage.jpg',
}

function Hero({ capa, total, pronta }) {
  return (
    <section className="relative overflow-hidden bg-[#250000] text-[#eae1d4]">
      {/* Até a capa chegar, só o fundo escuro no tamanho final: mostrar a
          capa de reserva e trocar logo depois piscaria a coleção errada. */}
      {pronta && (
        <div className="absolute inset-0">
          <img
            src={otimizar(capa.foto, 1400, MELHOR)}
            srcSet={fontes(capa.foto, [700, 1000, 1400, 1800, 2400], MELHOR)}
            sizes="100vw"
            alt=""
            fetchpriority="high"
            /* O recorte favorece o tronco: é onde a peça aparece, e é o que
               muda quando a foto de capa for trocada por outra. */
            className="w-full h-full object-cover object-[50%_38%]" />

          {/* Escurece só onde o texto pousa, para a foto não perder o resto */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#250000]/85 via-[#250000]/25 to-[#250000]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#250000]/60 to-transparent md:to-40%" />
        </div>
      )}

      <div className={`${CONTAINER} relative min-h-[70vh] md:min-h-[72vh] flex flex-col justify-end
        pt-24 pb-10 md:pt-32 md:pb-14`}>
        {pronta && (
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

            <h1 className="surgir font-black italic tracking-[-0.055em] leading-[0.82] mb-5 break-words"
              style={{ fontSize: 'clamp(3.5rem, 13vw, 9rem)', animationDelay: '160ms' }}>
              {capa.nome}
            </h1>

            {/* O cartão leva para a coleção; o acervo inteiro precisa de
                porta própria, senão a home tem uma saída só. */}
            <Link to="/catalogo"
              className="surgir inline-flex items-center gap-2 text-[11px] tracking-[0.18em]
                border-b border-[#eae1d4]/40 pb-1 hover:border-[#ffc509] hover:text-[#ffc509] transition-colors"
              style={{ animationDelay: '380ms' }}>
              VER O ACERVO
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Peça em destaque da coleção. Só a partir do tablet: no celular o
              cartão cobria metade da foto, e sem ele o texto desce para o pé
              da capa, por cima da foto. A coleção continua no menu e na home. */}
          {capa.slug && capa.destaque && (
            <div className="hidden md:col-span-5 relative z-10 md:flex md:justify-end">
              <Link to={`/catalogo?colecao=${capa.slug}`}
                className="surgir group block w-full max-w-[300px]" style={{ animationDelay: '460ms' }}>
                <div className="bg-[#eae1d4] overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <img src={otimizar(capa.destaque.imagem, 500)}
                    srcSet={fontes(capa.destaque.imagem, [300, 400, 500, 650])}
                    sizes="(min-width: 768px) 25vw, 80vw"
                    alt="" loading="lazy"
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <div className="bg-[#eae1d4] text-[#250000] px-4 py-3">
                  <p className="text-[9px] tracking-[0.28em] text-[#654a2b] mb-1">EM DESTAQUE</p>
                  <p className="text-lg leading-tight font-medium">{capa.destaque.nome}</p>
                  {capa.chamada && (
                    <p className="text-[11px] text-[#654a2b] mt-0.5 leading-snug">{capa.chamada}</p>
                  )}
                  <p className="text-[11px] text-[#250000] mt-2 inline-flex items-center gap-1.5">
                    ver coleção · {capa.total} {capa.total === 1 ? 'peça' : 'peças'}
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
            </div>
          )}

        </div>
        )}
      </div>
    </section>
  )
}

/* ─── Faixa de peças ────────────────────────────────────────────
   Uma por coleção na home, mais as "Últimas chegadas". Mesmo desenho
   para todas: título pequeno em caixa alta, "ver tudo" e a grade.     */
const FALLBACK = [
  { id: 1, nome: 'Blusa Vintage',  tamanho: 'M',  preco: 49,  novo: true },
  { id: 2, nome: 'Calça Wide Leg', tamanho: '38', preco: 89,  novo: false },
  { id: 3, nome: 'Vestido Floral', tamanho: 'P',  preco: 65,  novo: true },
  { id: 4, nome: 'Jaqueta Jeans',  tamanho: 'G',  preco: 120, novo: false },
]

function FaixaDePecas({ titulo, chamada, pecas, link }) {
  return (
    <section className={`${CONTAINER} pt-14 md:pt-24 pb-14 md:pb-24`}>
      <Revelar>
        <div className="flex items-baseline justify-between gap-4 mb-6 md:mb-10">
          <div className="min-w-0">
            <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">
              {titulo}
            </h2>
            {chamada && <p className="text-[13px] md:text-sm text-[#250000] mt-1.5">{chamada}</p>}
          </div>
          <Link to={link}
            className="group flex-none text-[11px] md:text-xs text-[#654a2b] hover:text-[#250000] transition-colors inline-flex items-center gap-2">
            ver tudo
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </Revelar>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-6 md:gap-y-12">
        {pecas.map((p, i) => (
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

/* ─── Instagram ──────────────────────────────────────────────────
   Os posts são imagens nossas, com o link do post: o embed do Instagram
   traria o script de rastreamento da Meta e pesaria no celular.

   No celular, uma fila que desliza de lado, com cada post em 3/4 da tela
   para o texto dos flyers ser legível; três quadrados lado a lado num
   telefone dariam 120px cada. No desktop, a grade inteira.           */
function IconeInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

function SecaoInstagram({ posts }) {
  return (
    <section className="pt-14 md:pt-24 pb-14 md:pb-24">
      <Revelar>
        <div className={`${CONTAINER} flex items-baseline justify-between gap-4 mb-6 md:mb-10`}>
          <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">
            No Instagram
          </h2>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener"
            className="group flex-none inline-flex items-center gap-2 min-h-11 text-[11px] md:text-xs
              text-[#654a2b] hover:text-[#250000] transition-colors">
            <IconeInstagram />
            @{INSTAGRAM}
            <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
          </a>
        </div>
      </Revelar>

      <ul className="max-w-6xl mx-auto flex gap-3 overflow-x-auto snap-x snap-mandatory escondeBarra
        px-4 scroll-px-4 md:px-8 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        {posts.map((p, i) => (
          <li key={p.url} className="flex-none w-[75%] snap-start md:w-auto">
            <a href={p.url} target="_blank" rel="noreferrer noopener"
              aria-label={`Post ${i + 1} da Tropia no Instagram (abre em outra aba)`}
              className="group block overflow-hidden rounded-sm bg-[#d6c8b3]" style={{ aspectRatio: '4/5' }}>
              <img src={otimizar(p.imagem, 600)} srcSet={fontes(p.imagem, [400, 600, 800])}
                sizes="(min-width: 768px) 33vw, 75vw" alt="" loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ─── Página ───────────────────────────────────────────────────── */

// Ordem de reserva se a API das coleções falhar: a de antes do painel.
const SECOES_RESERVA = [{ tipo: 'avaliacoes' }, { tipo: 'ultimas' }]

export default function Home() {
  const [pecas, setPecas] = useState([])
  const [total, setTotal] = useState(0)
  const [home, setHome] = useState(null)   // { capa, secoes }

  useEffect(() => {
    listarProdutos({ limite: 100 })
      .then(({ produtos }) => {
        setPecas(produtos.map(normalizarProduto))
        setTotal(produtos.length)
      })
      .catch(err => console.warn('API indisponível, usando exemplos:', err.message))

    obterHome()
      .then(setHome)
      .catch(err => {
        console.warn('Home sem coleções, usando a capa de reserva:', err.message)
        setHome({ capa: null, secoes: SECOES_RESERVA })
      })
  }, [])

  const secoes = home?.secoes ?? []

  return (
    <>
      <Hero capa={home?.capa ?? CAPA_RESERVA} total={total} pronta={home !== null} />
      <Ticker dark />
      {secoes.map((s, i) => {
        if (s.tipo === 'avaliacoes') return <Avaliacoes key="avaliacoes" />
        if (s.tipo === 'ultimas') {
          return (
            <FaixaDePecas key="ultimas" titulo="Últimas chegadas" link="/catalogo"
              pecas={pecas.length > 0 ? pecas.slice(0, 8) : FALLBACK} />
          )
        }
        if (s.tipo === 'colecao') {
          return (
            <FaixaDePecas key={s.slug} titulo={s.nome} chamada={s.chamada}
              link={`/catalogo?colecao=${s.slug}`} pecas={s.pecas.map(normalizarProduto)} />
          )
        }
        if (s.tipo === 'instagram') return <SecaoInstagram key="instagram" posts={s.posts} />
        return null   // seção que esta versão do site ainda não sabe desenhar
      })}
      <Ticker reverse />
    </>
  )
}
