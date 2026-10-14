import { useState } from 'react'

const MAX_TAGS = 8
const MAX_LETRAS = 24

// Mesma regra do servidor (utils/texto.js): minúscula, espaço único, sem #.
const limpar = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^#+/, '')

/**
 * Tags da peça: digita e dá Enter (ou vírgula) para virar etiqueta.
 *
 * As sugestões são as tags que outras peças já têm. Elas existem para a
 * mesma ideia não virar duas tags — "customizada" e "customizado" — porque
 * no site cada tag é um link para as peças que a têm, e tag dividida em duas
 * mostra metade das peças em cada.
 */
export default function CampoTags({ tags, aoMudar, sugestoes = [] }) {
  const [digitando, setDigitando] = useState('')

  // Aceita várias de uma vez ("anos 90, customizada"), que é o que chega
  // quando a pessoa cola uma lista.
  const adicionar = (bruta) => {
    const novas = bruta.split(',').map(limpar)
      .filter((t, i, todas) => t && t.length <= MAX_LETRAS && !tags.includes(t) && todas.indexOf(t) === i)
    if (novas.length) aoMudar([...tags, ...novas].slice(0, MAX_TAGS))
    setDigitando('')
  }

  // A vírgula fecha a tag aqui, no texto, e não no aoTeclar: teclado de
  // Android não diz qual tecla foi (manda "Unidentified"), e a vírgula
  // passava direto para dentro da tag.
  const aoDigitar = (valor) => {
    if (!valor.includes(',')) { setDigitando(valor); return }
    const partes = valor.split(',')
    const resto = partes.pop()
    adicionar(partes.join(','))
    setDigitando(resto)
  }

  const aoTeclar = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()   // Enter não pode enviar o formulário da peça
      adicionar(digitando)
    }
    if (e.key === 'Backspace' && !digitando && tags.length) {
      aoMudar(tags.slice(0, -1))
    }
  }

  const busca = limpar(digitando)
  const opcoes = sugestoes
    .filter(s => !tags.includes(s) && (!busca || s.includes(busca)))
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[#654a2b]">Tags</span>

      <div className="min-h-10 px-2 py-1.5 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm
        flex flex-wrap items-center gap-1.5 focus-within:border-[#654a2b]">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full
            bg-[#250000] text-[#eae1d4] text-xs">
            {t}
            <button type="button" onClick={() => aoMudar(tags.filter(x => x !== t))}
              aria-label={`Tirar a tag ${t}`}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#432d1c]">
              ×
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input value={digitando} onChange={(e) => aoDigitar(e.target.value)}
            onKeyDown={aoTeclar} onBlur={() => digitando && adicionar(digitando)}
            maxLength={MAX_LETRAS} enterKeyHint="done"
            placeholder={tags.length ? '' : 'ex: anos 90, customizada'}
            className="flex-1 min-w-[8rem] h-7 bg-transparent text-sm text-[#250000] outline-none" />
        )}
      </div>

      {opcoes.length > 0 && tags.length < MAX_TAGS && (
        <div className="flex flex-wrap gap-1.5">
          {opcoes.map(s => (
            <button key={s} type="button" onClick={() => adicionar(s)}
              className="h-8 px-3 rounded-full border border-[#d6c8b3] text-xs text-[#654a2b]
                hover:border-[#654a2b]">
              + {s}
            </button>
          ))}
        </div>
      )}

      <span className="text-[11px] text-[#654a2b] opacity-70">
        Aparecem na página da peça. Tocar numa tag mostra todas as peças com ela.
      </span>
    </div>
  )
}
