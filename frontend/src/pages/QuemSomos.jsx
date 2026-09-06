import { Link } from 'react-router-dom'
import AFazer from '../components/AFazer'

const CONTAINER = 'max-w-3xl mx-auto px-4 md:px-8'

// Os mesmos princípios do manifesto da home. Ficam num só lugar para não
// divergirem quando um dos dois for reescrito.
const PRINCIPIOS = [
  ['Garimpo à mão', 'Cada peça é escolhida, revisada e fotografada uma a uma. Nada entra no acervo sem passar por essa conferência.'],
  ['Peça única', 'Uma unidade de cada, sem reposição e sem grade de tamanhos. O que sai, não volta.'],
  ['Moda circular', 'Roupa que volta a circular em vez de virar lixo. Comprar de segunda mão é o gesto mais direto contra o descarte.'],
  ['Brasil inteiro', 'Frete fixo para todo o país, grátis acima de R$ 150.'],
]

export default function QuemSomos() {
  return (
    <section className={`${CONTAINER} pt-8 md:pt-16 pb-16 md:pb-24`}>
      <p className="text-[10px] md:text-[11px] tracking-[0.32em] text-[#654a2b] uppercase mb-3">
        Quem somos
      </p>
      <h1 className="font-black italic tracking-[-0.04em] leading-[0.9] text-[#250000] mb-6 md:mb-8"
        style={{ fontSize: 'clamp(2.25rem, 9vw, 4rem)' }}>
        Roupa com<br />história.
      </h1>

      <p className="text-[15px] md:text-base leading-relaxed text-[#250000] max-w-[62ch] mb-4">
        A Tropia é um brechó de peças únicas. Não trabalhamos com reposição nem
        com grade de tamanhos: cada item existe em uma só unidade, e quando ele
        sai, não volta.
      </p>

      <div className="max-w-[62ch] mb-10 md:mb-14">
        <AFazer>
          Aqui entra a história da loja, contada por quem a fez: quando começou,
          por que começou, quem garimpa as peças e de onde elas vêm. É o trecho
          que faz a diferença entre um brechó e uma loja qualquer — e é o único
          que ninguém pode escrever no seu lugar.
        </AFazer>
      </div>

      <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase mb-4">
        No que a gente acredita
      </h2>
      <div className="h-px bg-[#d6c8b3] mb-6 md:mb-8" />

      <ul className="flex flex-col gap-6 md:gap-8">
        {PRINCIPIOS.map(([titulo, texto]) => (
          <li key={titulo} className="md:grid md:grid-cols-[180px_1fr] md:gap-8">
            <h3 className="text-[15px] md:text-base font-medium text-[#250000] mb-1 md:mb-0">{titulo}</h3>
            <p className="text-[14px] md:text-[15px] leading-relaxed text-[#654a2b] max-w-[58ch]">{texto}</p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 mt-10 md:mt-14">
        <Link to="/catalogo"
          className="h-11 px-6 flex items-center bg-[#250000] text-[#eae1d4] text-[11px] tracking-[0.16em] rounded-sm hover:bg-[#432d1c] transition-colors">
          VER O ACERVO
        </Link>
        <Link to="/contato"
          className="h-11 px-6 flex items-center border border-[#250000] text-[#250000] text-[11px] tracking-[0.16em] rounded-sm hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
          FALAR COM A GENTE
        </Link>
      </div>
    </section>
  )
}
