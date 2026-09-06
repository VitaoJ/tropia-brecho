import AFazer from '../components/AFazer'

const CONTAINER = 'max-w-3xl mx-auto px-4 md:px-8'

// E-mail da loja, o mesmo usado no painel. Trocar aqui se houver um endereço
// separado para atendimento.
const EMAIL = 'tropia.brecho@gmail.com'

const ASSUNTOS = [
  ['Dúvida sobre uma peça', 'Medidas, condição, caimento. Cite o nome da peça que a resposta vem mais rápida.'],
  ['Pedido em andamento', 'Tenha em mãos o número do pedido, aquele código de 8 caracteres da tela de confirmação.'],
  ['Upcycling e customização', 'Descreva a transformação que quer e mande foto da peça.'],
  ['Quero vender peças', 'Conte o que tem e mande fotos.'],
]

export default function Contato() {
  return (
    <section className={`${CONTAINER} pt-8 md:pt-16 pb-16 md:pb-24`}>
      <p className="text-[10px] md:text-[11px] tracking-[0.32em] text-[#654a2b] uppercase mb-3">
        Contato
      </p>
      <h1 className="font-black italic tracking-[-0.04em] leading-[0.9] text-[#250000] mb-6 md:mb-8"
        style={{ fontSize: 'clamp(2.25rem, 9vw, 4rem)' }}>
        Fala com<br />a gente.
      </h1>

      <p className="text-[15px] md:text-base leading-relaxed text-[#250000] max-w-[62ch] mb-8">
        Somos gente pequena atendendo pessoa por pessoa. Responder pode levar
        algumas horas, mas responde.
      </p>

      <div className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-4 md:p-5 mb-4">
        <p className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-1.5">E-mail</p>
        <a href={`mailto:${EMAIL}`}
          className="text-[15px] md:text-lg text-[#250000] underline underline-offset-4 decoration-[#d6c8b3] hover:decoration-[#250000] transition-colors break-all">
          {EMAIL}
        </a>
      </div>

      <div className="mb-10 md:mb-14">
        <AFazer>
          Faltam os outros canais: o @ do Instagram, o WhatsApp de atendimento e
          o horário em que vocês respondem. Se a loja tiver endereço físico ou
          ponto de retirada, também entra aqui. Confirme se este e-mail é mesmo
          o de atendimento — hoje ele é o do painel.
        </AFazer>
      </div>

      <h2 className="text-[10px] md:text-xs tracking-[0.32em] text-[#654a2b] uppercase mb-4">
        O que você quer resolver
      </h2>
      <div className="h-px bg-[#d6c8b3] mb-6 md:mb-8" />

      <ul className="flex flex-col gap-5 md:gap-6">
        {ASSUNTOS.map(([titulo, texto]) => (
          <li key={titulo} className="md:grid md:grid-cols-[220px_1fr] md:gap-8">
            <h3 className="text-[15px] md:text-base font-medium text-[#250000] mb-1 md:mb-0">{titulo}</h3>
            <p className="text-[14px] md:text-[15px] leading-relaxed text-[#654a2b] max-w-[58ch]">{texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
