import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listarAvaliacoes } from '../services/api'
import { otimizar, fontes } from '../utils/imagem'
import Revelar from './Revelar'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/**
 * Nota, quando existe.
 *
 * Marcas cheias e vazias em vez de estrelas douradas: estrela é o vocabulário
 * de marketplace, e aqui a prova de verdade é a foto da peça que a pessoa
 * levou. A nota entra como detalhe, não como manchete.
 */
function Nota({ valor }) {
  if (!valor) return null
  return (
    <span className="flex gap-[3px]" role="img" aria-label={`${valor} de 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} aria-hidden="true"
          className={`w-[6px] h-[6px] rounded-full ${n <= valor ? 'bg-[#ffc509]' : 'bg-[#d6c8b3]'}`} />
      ))}
    </span>
  )
}

function Cartao({ a }) {
  return (
    <figure className="flex flex-col bg-[#f2ead9] border border-[#d6c8b3] rounded-sm overflow-hidden h-full">
      {a.foto && (
        <div className="relative bg-[#d6c8b3]" style={{ aspectRatio: '3/4' }}>
          <img
            src={otimizar(a.foto, 500)}
            srcSet={fontes(a.foto, [300, 400, 500, 650, 800])}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 78vw"
            alt={`Peça que ${a.autor} comprou`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover" />
        </div>
      )}

      <figcaption className="flex flex-col gap-3 p-4 flex-1">
        <blockquote className="text-[15px] leading-relaxed text-[#250000] flex-1">
          “{a.texto}”
        </blockquote>

        <div className="flex items-center gap-2 pt-3 border-t border-[#d6c8b3]">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#250000] leading-tight truncate">{a.autor}</p>
            {a.handle && <p className="text-[11px] text-[#654a2b] truncate">@{a.handle}</p>}
          </div>
          <Nota valor={a.nota} />
        </div>

        {a.peca && (
          <Link to={`/produto/${a.peca.id}`}
            className="flex items-center gap-2 -m-1 p-1 rounded-sm hover:bg-[#eae1d4] transition-colors group">
            <span className="w-8 h-10 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
              {a.peca.imagem && (
                <img src={otimizar(a.peca.imagem, 100)} alt="" className="w-full h-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] tracking-[0.2em] text-[#654a2b] uppercase">Levou</span>
              <span className="block text-[12px] text-[#250000] truncate group-hover:underline">
                {a.peca.nome}
              </span>
            </span>
          </Link>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * Quem já levou.
 *
 * Carrossel em todas as larguras, e não grade no desktop: com o próximo cartão
 * aparecendo pela metade na borda, fica claro que há mais para ver. Grade
 * fechada some com essa pista.
 *
 * Quem rola a página é o próprio navegador (scroll-snap). As setas só empurram
 * esse scroll, então dedo, trackpad, roda e teclado continuam funcionando sem
 * nada reimplementado.
 */
export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [pode, setPode] = useState({ antes: false, depois: false })
  const trilho = useRef(null)

  useEffect(() => {
    listarAvaliacoes()
      .then(({ avaliacoes }) => setAvaliacoes(avaliacoes ?? []))
      .catch(err => console.warn('Avaliações indisponíveis:', err.message))
  }, [])

  const medir = useCallback(() => {
    const el = trilho.current
    if (!el) return
    const fim = el.scrollWidth - el.clientWidth
    setPode({ antes: el.scrollLeft > 8, depois: el.scrollLeft < fim - 8 })
  }, [])

  useEffect(() => {
    const el = trilho.current
    if (!el) return
    medir()
    el.addEventListener('scroll', medir, { passive: true })
    window.addEventListener('resize', medir)
    return () => {
      el.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
    }
  }, [medir, avaliacoes])

  // Anda um cartão por clique, usando a largura real do item — assim continua
  // certo em qualquer tela sem número mágico.
  //
  // O 'smooth' é uma animação, e animação pode simplesmente não rodar: aba em
  // segundo plano, motor suspenso, reduced-motion. Quando isso acontece o
  // scrollBy não move nada e a seta parece quebrada. Então conferimos logo
  // depois e, se não saiu do lugar, empurramos de uma vez.
  const andar = (dir) => {
    const el = trilho.current
    if (!el) return

    const item = el.querySelector('li')
    const passo = item ? item.getBoundingClientRect().width + 24 : el.clientWidth * 0.8
    const alvo = el.scrollLeft + dir * passo
    const parado = el.scrollLeft

    const semAnimacao = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * passo, behavior: semAnimacao ? 'auto' : 'smooth' })

    // Remedir na mão depois de mexer, em vez de esperar o evento de scroll:
    // navegador com a aba escondida engole esses eventos, e aí as setas
    // travariam desabilitadas mesmo com o trilho já rolado.
    const conferir = () => {
      if (el.scrollLeft === parado && !semAnimacao) el.scrollLeft = alvo
      medir()
    }
    setTimeout(conferir, semAnimacao ? 0 : 220)
    setTimeout(medir, 600)
  }

  if (avaliacoes.length === 0) return null

  const Seta = ({ dir, ativa, rotulo }) => (
    <button type="button" onClick={() => andar(dir)} disabled={!ativa} aria-label={rotulo}
      className="w-9 h-9 rounded-full border border-[#d6c8b3] text-[#250000] flex items-center justify-center
        transition-opacity hover:bg-[#f2ead9] disabled:opacity-25 disabled:cursor-default">
      {dir < 0 ? '‹' : '›'}
    </button>
  )

  return (
    <section className={`${CONTAINER} pt-14 md:pt-24`}>
      <Revelar>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">
            Quem já levou
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase tabular-nums">
              {avaliacoes.length}
            </span>
            {/* Setas só no desktop: no celular o dedo já resolve */}
            <div className="hidden md:flex gap-1.5">
              <Seta dir={-1} ativa={pode.antes} rotulo="Avaliações anteriores" />
              <Seta dir={1} ativa={pode.depois} rotulo="Próximas avaliações" />
            </div>
          </div>
        </div>
        <div className="h-px bg-[#d6c8b3] esticar mb-6 md:mb-10" />
      </Revelar>

      {/* 3,25 cartões de largura no desktop: o quarto aparece cortado na borda
          e diz que há mais, coisa que uma grade fechada esconde. No celular o
          padding negativo faz o cartão encostar na borda, com o mesmo efeito. */}
      <ul ref={trilho}
        /* mandatory no celular deixa o swipe travar certinho em cada cartão;
             no desktop vira proximity porque mandatory puxa de volta o scroll
             das setas e elas param de funcionar. */
        className="flex gap-3 md:gap-6 overflow-x-auto snap-x snap-mandatory md:snap-proximity
          -mx-4 px-4 md:-mx-2 md:px-2 pb-2 escondeBarra">
        {avaliacoes.map((a, i) => (
          <li key={a.id}
            className="w-[78vw] max-w-[300px] md:w-[calc((100%-3rem)/3.25)] md:max-w-none flex-none snap-start">
            <Revelar atraso={i * 60} className="h-full">
              <Cartao a={a} />
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  )
}
