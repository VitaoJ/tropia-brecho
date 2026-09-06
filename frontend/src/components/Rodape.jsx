import { Link } from 'react-router-dom'
import { formatarPreco, FRETE_FIXO, FRETE_GRATIS_ACIMA_DE, DESCONTO_PIX } from '../utils/preco'
import logoTexto from '../assets/logo-texto.svg'

const COLUNAS = [
  ['Acervo', [
    ['Catálogo', '/catalogo'],
    ['Feminino', '/catalogo?genero=feminino'],
    ['Masculino', '/catalogo?genero=masculino'],
    ['Favoritos', '/favoritos'],
  ]],
  ['A Tropia', [
    ['Quem somos', '/quem-somos'],
    ['Upcycling e customização', '/upcycling'],
    ['Contato', '/contato'],
  ]],
]

export default function Rodape() {
  return (
    <footer className="bg-[#250000] text-[#eae1d4] mt-16 md:mt-24">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* No celular a marca vem primeiro e as colunas empilham em duas */}
        <div className="md:grid md:grid-cols-[1.4fr_1fr_1fr] md:gap-10">
          <div className="mb-8 md:mb-0">
            <img src={logoTexto} alt="Tropia" className="h-8 md:h-9 object-contain invert mb-3" />
            <p className="text-[13px] leading-relaxed text-[#eae1d4]/70 max-w-[38ch]">
              Brechó de peças únicas, garimpadas uma a uma. Cada item existe em
              uma só unidade — o que sai, não volta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:contents">
            {COLUNAS.map(([titulo, links]) => (
              <div key={titulo}>
                <h2 className="text-[10px] tracking-[0.24em] text-[#eae1d4]/50 uppercase mb-3">{titulo}</h2>
                <ul className="flex flex-col gap-2">
                  {links.map(([label, path]) => (
                    <li key={path}>
                      <Link to={path} className="text-[13px] text-[#eae1d4]/85 hover:text-[#ffc509] transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* As regras que mais geram dúvida, ditas onde a pessoa procura */}
        <div className="mt-10 md:mt-12 pt-6 border-t border-[#eae1d4]/15
          grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px] text-[#eae1d4]/70">
          <p><strong className="font-medium text-[#eae1d4]">Frete</strong> {formatarPreco(FRETE_FIXO)} fixo,
            grátis acima de {formatarPreco(FRETE_GRATIS_ACIMA_DE)}</p>
          <p><strong className="font-medium text-[#eae1d4]">PIX</strong> {DESCONTO_PIX * 100}% de desconto,
            acumulável com cupom</p>
          <p><strong className="font-medium text-[#eae1d4]">Peça única</strong> uma unidade de cada,
            sem reposição</p>
        </div>

        <p className="mt-8 text-[11px] text-[#eae1d4]/40">
          © {new Date().getFullYear()} Tropia Brechó
        </p>
      </div>
    </footer>
  )
}
