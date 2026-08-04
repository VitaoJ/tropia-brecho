import { useRef, useEffect, useState } from 'react'

// Revela o conteúdo quando ele entra na tela, uma vez só.
// O estado visível é o padrão do CSS: se o observer falhar ou as transições
// não rodarem, o conteúdo aparece mesmo assim.
export default function Revelar({ children, atraso = 0, className = '' }) {
  const ref = useRef(null)
  const [oculto, setOculto] = useState(true)

  useEffect(() => {
    const alvo = ref.current
    if (!alvo) return

    // Sem suporte a IntersectionObserver, mostra direto
    if (typeof IntersectionObserver === 'undefined') {
      setOculto(false)
      return
    }

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOculto(false); obs.disconnect() }
    }, { rootMargin: '0px 0px -40px 0px' })

    obs.observe(alvo)

    // Rede de segurança: se em 2s nada disparou, revela assim mesmo
    const escape = setTimeout(() => { setOculto(false); obs.disconnect() }, 2000)

    return () => { clearTimeout(escape); obs.disconnect() }
  }, [])

  return (
    <div ref={ref} data-oculto={oculto} className={`revelar ${className}`}
      style={{ '--atraso': `${atraso}ms` }}>
      {children}
    </div>
  )
}
