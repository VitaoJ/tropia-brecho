import { formatarPreco, FRETE_GRATIS_ACIMA_DE, calcularFrete } from '../../utils/preco'

/**
 * Opções de entrega vindas da cotação.
 *
 * O preço mostrado é o que o cliente paga de fato, já com a regra do frete
 * grátis aplicada: acima do mínimo a loja cobre o valor da opção mais barata
 * e sobra só a diferença. Mostrar o preço cheio e descontar depois faria a
 * pessoa escolher com um número e pagar outro.
 */
export default function OpcoesEntrega({ opcoes, escolhida, aoEscolher, carregando, erro, estimado, valorDoPedido }) {
  if (carregando) {
    return <p className="text-[13px] text-[#654a2b]">Calculando o frete para o seu CEP...</p>
  }
  if (erro) {
    return (
      <p className="text-[13px] text-[#8a4b00] bg-[#fdf1e3] border border-[#e0a45c] rounded-sm px-3 py-2.5 leading-relaxed">
        {erro}
      </p>
    )
  }
  if (!opcoes?.length) return null

  const maisBarata = opcoes[0].preco   // a API devolve ordenado por preço
  const temGratis = valorDoPedido >= FRETE_GRATIS_ACIMA_DE

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[11px] tracking-[0.16em] text-[#654a2b] uppercase mb-1">
        Como quer receber
      </legend>

      {opcoes.map(o => {
        const paga = calcularFrete(valorDoPedido, o.preco, maisBarata)
        const ativa = escolhida?.id === o.id
        return (
          <label key={o.id}
            className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-colors
              ${ativa ? 'border-[#250000] bg-[#f2ead9]' : 'border-[#d6c8b3] hover:border-[#654a2b]'}`}>
            <input type="radio" name="entrega" checked={ativa}
              onChange={() => aoEscolher(o)} className="sr-only" />

            <span className={`w-4 h-4 rounded-full border flex-none flex items-center justify-center
              ${ativa ? 'border-[#250000]' : 'border-[#d6c8b3]'}`}>
              {ativa && <span className="w-2 h-2 rounded-full bg-[#250000]" />}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-[14px] text-[#250000] truncate">
                {o.nome}{o.empresa && <span className="text-[#654a2b]"> · {o.empresa}</span>}
              </span>
              {o.prazoDias != null && (
                <span className="block text-[11px] text-[#654a2b]">
                  {o.prazoDias} {o.prazoDias === 1 ? 'dia útil' : 'dias úteis'}
                </span>
              )}
            </span>

            <span className="text-right flex-none">
              {paga === 0 ? (
                <span className="text-[13px] font-medium text-[#2d6a4f]">Grátis</span>
              ) : (
                <>
                  <span className="block text-[14px] font-medium text-[#250000]">{formatarPreco(paga)}</span>
                  {/* Quando a loja cobre parte, dizer quanto foi coberto evita
                      a impressão de que o preço subiu sem explicação. */}
                  {temGratis && paga < o.preco && (
                    <span className="block text-[10px] text-[#654a2b] line-through">{formatarPreco(o.preco)}</span>
                  )}
                </>
              )}
            </span>
          </label>
        )
      })}

      {temGratis && (
        <p className="text-[11px] text-[#2d6a4f] leading-relaxed">
          Seu pedido passou de {formatarPreco(FRETE_GRATIS_ACIMA_DE)}: cobrimos o
          valor da entrega mais barata. Nas outras, você paga só a diferença.
        </p>
      )}

      {estimado && (
        <p className="text-[11px] text-[#654a2b] leading-relaxed">
          Peso e medidas estimados para alguma peça. Se houver diferença na
          postagem, a gente avisa antes de cobrar qualquer coisa.
        </p>
      )}
    </fieldset>
  )
}
