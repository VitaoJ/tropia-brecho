// Campo de formulário do checkout.
//
// O erro fica embaixo e o rótulo sempre visível (nunca só placeholder): quem
// preencheu metade do formulário e voltou precisa enxergar o que é cada campo.
export default function Campo({
  rotulo, nome, valor, aoMudar, erro, dica,
  tipo = 'text', modo, autoComplete, maxLength, placeholder, className = '',
}) {
  const id = `campo-${nome}`

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[11px] tracking-[0.12em] text-[#654a2b] uppercase">
        {rotulo}
      </label>

      <input
        id={id}
        name={nome}
        type={tipo}
        inputMode={modo}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => aoMudar(nome, e.target.value)}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        className={`h-12 px-3 bg-[#f2ead9] border rounded-sm text-[15px] text-[#250000] outline-none
          transition-colors placeholder:text-[#654a2b]/50
          ${erro ? 'border-[#c44b00] focus:border-[#c44b00]' : 'border-[#d6c8b3] focus:border-[#654a2b]'}`}
      />

      {erro
        ? <p id={`${id}-erro`} className="text-[11px] text-[#c44b00]">{erro}</p>
        : dica && <p id={`${id}-dica`} className="text-[11px] text-[#654a2b]/80">{dica}</p>}
    </div>
  )
}
