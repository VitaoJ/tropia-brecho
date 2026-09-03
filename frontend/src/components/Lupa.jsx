import { useState, useEffect, useRef, useCallback } from 'react'
import { otimizar, fontes, MELHOR } from '../utils/imagem'

/**
 * Foto em tela cheia com zoom.
 *
 * Num brechó a foto é a única forma de conferir costura, desgaste e trama —
 * é o que substitui pegar a peça na mão. Por isso o zoom vai à resolução mais
 * alta que existe, e não a uma versão de vitrine ampliada.
 *
 * No celular o zoom fica por conta do próprio navegador (pinça), que é mais
 * fluido que qualquer coisa reimplementada em JavaScript. No desktop, clicar
 * amplia e o mouse arrasta a área visível.
 */
export default function Lupa({ fotos, indice, nome, aoFechar }) {
  const [i, setI] = useState(indice)
  const [ampliado, setAmpliado] = useState(false)
  const [origem, setOrigem] = useState({ x: 50, y: 50 })
  const inicioX = useRef(null)

  const ir = useCallback((n) => {
    setI((n + fotos.length) % fotos.length)
    setAmpliado(false)
  }, [fotos.length])

  // Teclado: setas navegam, Esc fecha. Sem isto o modal vira uma armadilha
  // para quem não usa mouse.
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'Escape') { ampliado ? setAmpliado(false) : aoFechar() }
      if (e.key === 'ArrowLeft') ir(i - 1)
      if (e.key === 'ArrowRight') ir(i + 1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [i, ampliado, ir, aoFechar])

  // Trava o rolar da página atrás do modal
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = antes }
  }, [])

  const aoTocar = (e) => { if (!ampliado) inicioX.current = e.touches[0].clientX }
  const aoSoltar = (e) => {
    if (inicioX.current === null) return
    const dif = inicioX.current - e.changedTouches[0].clientX
    if (Math.abs(dif) > 45) ir(i + (dif > 0 ? 1 : -1))
    inicioX.current = null
  }

  const mover = (e) => {
    if (!ampliado) return
    const r = e.currentTarget.getBoundingClientRect()
    setOrigem({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    })
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`${nome} — foto ${i + 1} de ${fotos.length}`}
      className="fixed inset-0 z-[60] bg-[#250000]/95 flex flex-col"
      onClick={aoFechar}>

      <div className="flex items-center justify-between px-4 h-14 flex-none text-[#eae1d4]">
        <span className="text-[11px] tracking-[0.2em] tabular-nums opacity-80">
          {String(i + 1).padStart(2, '0')} / {String(fotos.length).padStart(2, '0')}
        </span>
        <button onClick={aoFechar} aria-label="Fechar"
          className="w-10 h-10 -mr-2 flex items-center justify-center text-2xl leading-none hover:opacity-70">
          ×
        </button>
      </div>

      {/* touch-action pinch-zoom entrega a pinça para o navegador em vez de
          reimplementar gesto na mão — mais fluido e sem bug de dois dedos. */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2 overflow-hidden"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
        <img
          src={otimizar(fotos[i], 1600, MELHOR)}
          srcSet={fontes(fotos[i], [800, 1200, 1600, 2000], MELHOR)}
          sizes="100vw"
          alt={`${nome} — foto ${i + 1}`}
          onMouseMove={mover}
          onClick={() => setAmpliado(v => !v)}
          className={`max-w-full max-h-full object-contain select-none transition-transform duration-300
            ${ampliado ? 'scale-[2.2] cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={ampliado ? { transformOrigin: `${origem.x}% ${origem.y}%` } : undefined} />
      </div>

      {fotos.length > 1 && (
        <div className="flex-none flex items-center justify-center gap-2 pb-5 px-4"
          onClick={(e) => e.stopPropagation()}>
          {fotos.map((f, n) => (
            <button key={n} onClick={() => ir(n)} aria-label={`Ver foto ${n + 1}`}
              className={`w-10 h-13 rounded-sm overflow-hidden border transition-opacity
                ${n === i ? 'border-[#ffc509]' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ height: '3.25rem' }}>
              <img src={otimizar(f, 120)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="flex-none text-center text-[10px] tracking-[0.16em] text-[#eae1d4]/50 pb-4 md:pb-6">
        <span className="hidden md:inline">CLIQUE NA FOTO PARA AMPLIAR · ESC PARA FECHAR</span>
        <span className="md:hidden">USE DOIS DEDOS PARA AMPLIAR</span>
      </p>
    </div>
  )
}
