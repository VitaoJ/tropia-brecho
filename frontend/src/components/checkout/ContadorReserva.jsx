const relogio = (segundos) => {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Mostra por quanto tempo as peças estão seguradas.
 *
 * O tom sobe junto com a pressa: calmo no começo, âmbar no último minuto.
 * Só isso — nada de piscar ou vibrar, porque a urgência aqui é real e não
 * precisa de teatro.
 */
export default function ContadorReserva({ estado, segundos, aoRenovar }) {
  if (estado === 'reservando') {
    return (
      <p className="text-[11px] text-[#654a2b] px-3 py-2.5 bg-[#f2ead9] border border-[#d6c8b3] rounded-sm">
        Separando suas peças...
      </p>
    )
  }

  if (estado === 'expirado') {
    return (
      <div className="px-3 py-2.5 bg-[#fdf1e3] border border-[#e0a45c] rounded-sm flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#8a4b00] leading-relaxed">
          O tempo acabou. Suas peças voltaram para a loja — se ninguém levou,
          dá para separar de novo.
        </p>
        <button onClick={aoRenovar}
          className="flex-none text-[11px] tracking-[0.1em] border border-[#8a4b00] text-[#8a4b00]
            px-3 py-1.5 rounded-sm hover:bg-[#8a4b00] hover:text-[#fdf1e3] transition-colors">
          SEPARAR
        </button>
      </div>
    )
  }

  if (estado !== 'ok') return null

  const acabando = segundos <= 60

  return (
    <div className={`px-3 py-2.5 rounded-sm border flex items-center gap-2
      ${acabando ? 'bg-[#fdf1e3] border-[#e0a45c]' : 'bg-[#f2ead9] border-[#d6c8b3]'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke={acabando ? '#8a4b00' : '#654a2b'} strokeWidth="1.8" className="flex-none">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
      <p className={`text-[11px] leading-relaxed ${acabando ? 'text-[#8a4b00]' : 'text-[#654a2b]'}`}>
        {acabando ? 'Últimos instantes: ' : 'Peças separadas para você por mais '}
        <strong className="font-medium tabular-nums">{relogio(segundos)}</strong>
      </p>
    </div>
  )
}
