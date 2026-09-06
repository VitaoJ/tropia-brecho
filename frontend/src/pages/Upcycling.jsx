import { Link } from 'react-router-dom'
import AFazer from '../components/AFazer'

const CONTAINER = 'max-w-3xl mx-auto px-4 md:px-8'

const ETAPAS = [
  ['Você conta o que quer', 'Manda a peça ou escolhe uma do acervo e descreve a mudança: ajuste de caimento, troca de botões, aplicação, tingimento.'],
  ['A gente responde com o plano', 'Volta o que dá para fazer, o prazo e o valor antes de qualquer coisa começar.'],
  ['A peça é transformada', 'O trabalho é manual e feito uma peça por vez.'],
  ['Chega pronta', 'Enviamos de volta para todo o Brasil.'],
]

export default function Upcycling() {
  return (
    <section className={`${CONTAINER} pt-8 md:pt-16 pb-16 md:pb-24`}>
      <p className="text-[10px] md:text-[11px] tracking-[0.32em] text-[#654a2b] uppercase mb-3">
        Upcycling e customização
      </p>
      <h1 className="font-black italic tracking-[-0.04em] leading-[0.9] text-[#250000] mb-6 md:mb-8"
        style={{ fontSize: 'clamp(2.25rem, 9vw, 4rem)' }}>
        A peça muda,<br />não vira lixo.
      </h1>

      <p className="text-[15px] md:text-base leading-relaxed text-[#250000] max-w-[62ch] mb-4">
        Upcycling é transformar uma roupa que já existe em outra melhor, em vez
        de comprar uma nova. Serve para a peça que ficou grande, para a que você
        ama e desbotou, e para aquela que quase serve.
      </p>

      <div className="max-w-[62ch] mb-10 md:mb-14">
        <AFazer>
          Aqui entram os serviços que a Tropia realmente faz e como cobra: quais
          transformações estão no cardápio, faixa de preço de cada uma, prazo
          médio, se aceita peça do cliente ou só do acervo, e por qual canal o
          pedido chega. Sem isso a página promete o que talvez não exista.
        </AFazer>
      </div>

      <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase mb-4">
        Como funciona
      </h2>
      <div className="h-px bg-[#d6c8b3] mb-6 md:mb-8" />

      {/* Aqui a numeração diz algo de verdade: é uma ordem que a pessoa segue */}
      <ol className="flex flex-col gap-6 md:gap-8">
        {ETAPAS.map(([titulo, texto], i) => (
          <li key={titulo} className="grid grid-cols-[2rem_1fr] md:grid-cols-[3rem_1fr] gap-3 md:gap-6">
            <span className="text-[11px] md:text-xs tracking-[0.2em] text-[#654a2b]/70 tabular-nums pt-1">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 className="text-[15px] md:text-base font-medium text-[#250000] mb-1">{titulo}</h3>
              <p className="text-[14px] md:text-[15px] leading-relaxed text-[#654a2b] max-w-[58ch]">{texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 md:mt-14">
        <Link to="/contato"
          className="h-11 px-6 inline-flex items-center bg-[#250000] text-[#eae1d4] text-[11px] tracking-[0.16em] rounded-sm hover:bg-[#432d1c] transition-colors">
          PEDIR UM ORÇAMENTO
        </Link>
      </div>
    </section>
  )
}
