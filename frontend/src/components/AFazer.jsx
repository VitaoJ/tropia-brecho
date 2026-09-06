/**
 * Marca um trecho que espera texto real do cliente.
 *
 * Fica visível no site de propósito, como os exemplos de avaliação: enquanto
 * estiver no ar, ninguém confunde rascunho com conteúdo definitivo. Sai do
 * código quando o texto chegar.
 */
export default function AFazer({ children }) {
  return (
    <p className="text-[13px] leading-relaxed text-[#8a4b00] bg-[#fdf1e3]
      border border-dashed border-[#e0a45c] rounded-sm px-3 py-2.5">
      <span className="text-[10px] tracking-[0.16em] block mb-1 opacity-80">A PREENCHER</span>
      {children}
    </p>
  )
}
