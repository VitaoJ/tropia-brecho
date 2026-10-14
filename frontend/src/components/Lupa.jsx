import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { otimizar, fontes, MELHOR } from '../utils/imagem'

// Quanto dura o cruzamento entre uma foto e a próxima
const TROCA = 160

/**
 * Foto em tela cheia com zoom.
 *
 * Num brechó a foto é a única forma de conferir costura, desgaste e trama —
 * é o que substitui pegar a peça na mão. Por isso o zoom vai à resolução mais
 * alta que existe, e não a uma versão de vitrine ampliada.
 *
 * Vai para o body por portal, e não fica onde foi escrita: a galeria mora
 * dentro de um `position: sticky`, que cria contexto de empilhamento e prende
 * qualquer `fixed` lá dentro. Sem o portal, as peças similares — que vêm
 * depois no DOM — pintavam por cima da foto aberta, e z-index nenhum resolve.
 *
 * No celular o zoom fica por conta do próprio navegador (pinça), que é mais
 * fluido que qualquer coisa reimplementada em JavaScript. No desktop, clicar
 * amplia e o mouse arrasta a área visível.
 *
 * Controlada: quem sabe qual foto está aberta é a galeria da página, e a lupa
 * só pede para mudar (`aoMudar`). Quando cada uma guardava o próprio índice,
 * a miniatura da lupa trocava só a lupa, a seta rápida perdia um passo dentro
 * do fade, e a foto de trás ficava diferente da da frente.
 */
export default function Lupa({ fotos, indice, aoMudar, nome, aoFechar }) {
  // A foto que está NA TELA. Segue `indice` com atraso de TROCA, para dar
  // tempo de apagar antes de trocar.
  const [i, setI] = useState(indice)
  const [ampliado, setAmpliado] = useState(false)
  const [origem, setOrigem] = useState({ x: 50, y: 50 })
  const [entrou, setEntrou] = useState(false)   // fundo e foto surgem aos poucos
  const [trocando, setTrocando] = useState(false)
  const inicioX = useRef(null)

  // Só depois de montado é que ligamos a opacidade: o navegador precisa
  // pintar o estado inicial uma vez para ter de onde animar.
  //
  // rAF sozinho não serve: ele simplesmente NÃO roda com o documento oculto,
  // e a lupa abriria invisível. O temporizador roda de qualquer jeito, então
  // ele é a garantia e o rAF é só o caminho rápido quando a aba está à vista.
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setEntrou(true))
    const rede = setTimeout(() => setEntrou(true), 80)
    return () => { cancelAnimationFrame(quadro); clearTimeout(rede) }
  }, [])

  // Absoluto (miniatura) ou relativo (seta, swipe). O relativo vai como
  // função do índice atual da galeria: duas setas antes de a tela redesenhar
  // leriam o mesmo índice velho e andariam um passo só.
  const ir = useCallback((n) => aoMudar(n), [aoMudar])
  const passar = useCallback((d) => aoMudar(atual => atual + d), [aoMudar])

  // Apaga, troca, acende: o corte seco entre duas fotos de roupa parecia
  // falha de carregamento. Se o índice mudar de novo no meio do apagar, o
  // timer recomeça já com o destino novo — nenhum passo se perde, porque a
  // conta é sempre feita sobre `indice`, que é o da galeria.
  useEffect(() => {
    if (indice === i) return
    setTrocando(true)
    const t = setTimeout(() => {
      setI(indice)
      setAmpliado(false)
      setTrocando(false)
    }, TROCA)
    return () => clearTimeout(t)
  }, [indice, i])

  // Teclado: setas navegam, Esc fecha. Sem isto o modal vira uma armadilha
  // para quem não usa mouse.
  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'Escape') { ampliado ? setAmpliado(false) : aoFechar() }
      if (e.key === 'ArrowLeft') passar(-1)
      if (e.key === 'ArrowRight') passar(1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [ampliado, passar, aoFechar])

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
    if (Math.abs(dif) > 45) passar(dif > 0 ? 1 : -1)
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

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${nome} — foto ${i + 1} de ${fotos.length}`}
      onClick={aoFechar}
      className={`fixed inset-0 z-[200] flex flex-col bg-[#250000]/80 backdrop-blur-md
        transition-opacity duration-300 ease-out ${entrou ? 'opacity-100' : 'opacity-0'}`}>

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
          reimplementar gesto na mão — mais fluido e sem bug de dois dedos.

          Esta área não segura o clique: clicar no fundo em volta da foto
          fecha. Antes ela bloqueava, e só o cabeçalho e o rodapé fechavam —
          o fundo marrom parecia clicável e não era. Quem segura é a foto. */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2 overflow-hidden"
        style={{ touchAction: 'pinch-zoom' }}
        onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
        <img
          src={otimizar(fotos[i], 1600, MELHOR)}
          srcSet={fontes(fotos[i], [800, 1200, 1600, 2000], MELHOR)}
          sizes="100vw"
          alt={`${nome} — foto ${i + 1}`}
          onMouseMove={mover}
          onClick={(e) => { e.stopPropagation(); setAmpliado(v => !v) }}
          className={`max-w-full max-h-full object-contain select-none
            ${trocando || !entrou ? 'opacity-0' : 'opacity-100'}
            ${ampliado ? 'scale-[2.2] cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{
            // O apagar cabe dentro de TROCA, senão a foto trocava antes de
            // sumir e o cruzamento não aparecia. O zoom fica mais lento de
            // propósito: ampliar é gesto, trocar de foto é passagem.
            transition: `opacity ${TROCA - 20}ms ease-out, transform 300ms ease-out`,
            ...(ampliado ? { transformOrigin: `${origem.x}% ${origem.y}%` } : {}),
          }} />
      </div>

      {fotos.length > 1 && (
        <div className="flex-none flex items-center justify-center gap-2 pb-5 px-4">
          {fotos.map((f, n) => (
            <button key={n} onClick={(e) => { e.stopPropagation(); ir(n) }} aria-label={`Ver foto ${n + 1}`}
              className={`w-10 rounded-sm overflow-hidden border transition-all duration-200
                ${n === indice ? 'border-[#ffc509]' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ height: '3.25rem' }}>
              <img src={otimizar(f, 120)} alt="" className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <p className="flex-none text-center text-[10px] tracking-[0.16em] text-[#eae1d4]/50 pb-4 md:pb-6">
        <span className="hidden md:inline">CLIQUE NA FOTO PARA AMPLIAR · CLIQUE FORA PARA FECHAR</span>
        <span className="md:hidden">DOIS DEDOS AMPLIAM · TOQUE FORA PARA FECHAR</span>
      </p>
    </div>,
    document.body
  )
}
