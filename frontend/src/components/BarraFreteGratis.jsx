import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatarPreco, FRETE_GRATIS_ACIMA_DE, BRINDE_ACIMA_DE } from '../utils/preco'

/**
 * Barra fina no topo, em todas as páginas.
 *
 * Mostra quanto falta para o próximo benefício, um de cada vez: primeiro o
 * frete grátis, depois o brinde. Dizer as duas metas juntas dilui as duas —
 * quem está a R$ 20 do frete não decide por causa de um brinde a R$ 100.
 *
 * Sem nada no carrinho ela anuncia o benefício em vez de cobrar progresso:
 * barra em zero não convence ninguém.
 */
export default function BarraFreteGratis() {
  const { subtotal, descontoCupom, quantidade } = useCart()
  const valor = subtotal - descontoCupom   // mesma base que decide o frete

  const meta = valor < FRETE_GRATIS_ACIMA_DE
    ? { alvo: FRETE_GRATIS_ACIMA_DE, premio: 'frete grátis' }
    : valor < BRINDE_ACIMA_DE
      ? { alvo: BRINDE_ACIMA_DE, premio: 'brinde' }
      : null

  const progresso = meta ? Math.min((valor / meta.alvo) * 100, 100) : 100

  return (
    <div className="bg-[#250000] text-[#eae1d4]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-1.5 md:py-2">
        <Link to={quantidade > 0 ? '/carrinho' : '/catalogo'} className="block group">
          <p className="text-[10px] md:text-[11px] leading-snug text-center tracking-[0.04em]">
            {quantidade === 0 ? (
              <>Frete grátis acima de <strong className="font-medium">{formatarPreco(FRETE_GRATIS_ACIMA_DE)}</strong>
                {' '}· brinde acima de <strong className="font-medium">{formatarPreco(BRINDE_ACIMA_DE)}</strong></>
            ) : meta ? (
              <>Faltam <strong className="font-medium text-[#ffc509]">{formatarPreco(meta.alvo - valor)}</strong>
                {' '}para {meta.premio}</>
            ) : (
              <>Você tem <strong className="font-medium text-[#ffc509]">frete grátis e brinde</strong> neste pedido</>
            )}
          </p>

          {quantidade > 0 && (
            <span className="block mt-1 h-[3px] rounded-full bg-[#eae1d4]/20 overflow-hidden max-w-[280px] mx-auto">
              <span className="block h-full rounded-full bg-[#ffc509] transition-[width] duration-500"
                style={{ width: `${progresso}%` }} />
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
