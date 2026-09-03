import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listarAvaliacoes } from '../services/api'
import { otimizar, fontes } from '../utils/imagem'
import Revelar from './Revelar'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'

/**
 * Nota, quando existe.
 *
 * Marcas cheias e vazias em vez de estrelas douradas: estrela é o vocabulário
 * de marketplace, e aqui a prova de verdade é a foto da pessoa com a peça.
 * A nota entra como detalhe, não como manchete.
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
            alt={`${a.autor} com a peça que comprou`}
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
            {a.handle && (
              <p className="text-[11px] text-[#654a2b] truncate">@{a.handle}</p>
            )}
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
 * Some por completo quando não há avaliação publicada — seção de depoimento
 * vazia, ou com texto de exemplo, é pior que seção nenhuma.
 */
export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([])

  useEffect(() => {
    listarAvaliacoes()
      .then(({ avaliacoes }) => setAvaliacoes(avaliacoes ?? []))
      .catch(err => console.warn('Avaliações indisponíveis:', err.message))
  }, [])

  if (avaliacoes.length === 0) return null

  return (
    <section className={`${CONTAINER} pt-14 md:pt-24`}>
      <Revelar>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase">
            Quem já levou
          </h2>
          <span className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase tabular-nums">
            {avaliacoes.length}
          </span>
        </div>
        <div className="h-px bg-[#d6c8b3] esticar mb-6 md:mb-10" />
      </Revelar>

      {/* No celular, faixa que rola de lado: cabe foto grande sem empurrar a
          página inteira para baixo. No desktop vira grade. */}
      <ul className="flex gap-3 md:gap-6 overflow-x-auto md:overflow-visible
        md:grid md:grid-cols-2 lg:grid-cols-3 -mx-4 px-4 md:mx-0 md:px-0
        snap-x snap-mandatory md:snap-none pb-1">
        {avaliacoes.map((a, i) => (
          <li key={a.id}
            className="w-[78vw] max-w-[320px] md:w-auto md:max-w-none flex-none snap-start">
            <Revelar atraso={i * 60} className="h-full">
              <Cartao a={a} />
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  )
}
