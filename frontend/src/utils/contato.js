/**
 * Canais públicos da loja.
 *
 * Ficam num arquivo só porque aparecem no rodapé e na página de contato — e,
 * quando um número muda, muda num lugar. Não é configuração de ambiente: é
 * conteúdo do site, e trocar aqui é trocar no site inteiro.
 */

export const EMAIL = 'tropia.brecho@gmail.com'

export const INSTAGRAM = 'tropia.br'
export const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM}`

// Guardado só com dígitos: o link do WhatsApp exige DDI e DDD colados, e a
// tela quer a máscara. Derivar as duas formas de um número só evita que uma
// mude e a outra fique para trás.
export const TELEFONE = '11973320755'
export const TELEFONE_EXIBICAO = TELEFONE.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
export const WHATSAPP_URL = `https://wa.me/55${TELEFONE}`

// No lugar de horário de atendimento. A loja é atendida por gente, uma pessoa
// de cada vez — dizer isso vale mais que prometer uma janela que nem sempre
// dá para cumprir.
export const RECADO_ATENDIMENTO =
  'Somos gente pequena atendendo pessoa por pessoa. Podemos demorar algumas horas, mas sempre respondemos.'
