// Validação dos campos do checkout.
//
// Espelha as regras de backend/src/routes/pedidos.js de propósito: aqui é só
// para avisar cedo, enquanto a pessoa digita. Quem decide é sempre o servidor
// — se as duas discordarem, o pedido é recusado lá e nada quebra silenciosamente.

export const soDigitos = (valor) => String(valor ?? '').replace(/\D/g, '')

/* ─── Máscaras ───────────────────────────────────────────────── */

export function mascaraCPF(valor) {
  const d = soDigitos(valor).slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function mascaraTelefone(valor) {
  const d = soDigitos(valor).slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export const mascaraCEP = (valor) =>
  soDigitos(valor).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')

/* ─── Regras ─────────────────────────────────────────────────── */

export const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
                    'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

// Dígito verificador do CPF. Sem isto, um CPF de 11 dígitos aleatórios passaria
// no formulário e só seria recusado pelo Mercado Pago, depois de tudo preenchido.
export function cpfValido(valor) {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digito = (ate) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Erros da etapa de dados, no formato { campo: mensagem }. */
export function validarDados({ nome, email, cpf, telefone }) {
  const erros = {}
  const n = String(nome ?? '').trim()
  // Nome e sobrenome: o Mercado Pago e a etiqueta dos Correios pedem os dois.
  if (!n) erros.nome = 'Informe seu nome'
  else if (!n.includes(' ') || n.length < 3) erros.nome = 'Informe nome e sobrenome'

  if (!String(email ?? '').trim()) erros.email = 'Informe seu e-mail'
  else if (!EMAIL.test(String(email).trim())) erros.email = 'E-mail inválido'

  if (!soDigitos(cpf)) erros.cpf = 'Informe seu CPF'
  else if (!cpfValido(cpf)) erros.cpf = 'CPF inválido — confira os números'

  const tel = soDigitos(telefone)
  if (!tel) erros.telefone = 'Informe seu telefone'
  else if (tel.length < 10 || tel.length > 11) erros.telefone = 'Telefone incompleto'

  return erros
}

/** Erros da etapa de endereço. */
export function validarEndereco({ cep, rua, numero, bairro, cidade, estado }) {
  const erros = {}
  if (soDigitos(cep).length !== 8) erros.cep = 'CEP precisa ter 8 dígitos'
  if (!String(rua ?? '').trim()) erros.rua = 'Informe a rua'
  if (!String(numero ?? '').trim()) erros.numero = 'Informe o número'
  if (!String(bairro ?? '').trim()) erros.bairro = 'Informe o bairro'
  if (!String(cidade ?? '').trim()) erros.cidade = 'Informe a cidade'
  if (!UFS.includes(String(estado ?? '').toUpperCase())) erros.estado = 'UF inválida'
  return erros
}

/**
 * Busca o endereço no ViaCEP. Devolve null quando o CEP não existe.
 * Erro de rede sobe como exceção: o checkout deixa preencher na mão em vez
 * de travar a compra porque um serviço de terceiro caiu.
 */
export async function buscarCEP(cep) {
  const limpo = soDigitos(cep)
  if (limpo.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
  if (!res.ok) throw new Error('Não foi possível consultar o CEP')

  const dados = await res.json()
  if (dados.erro) return null

  return {
    rua: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    estado: dados.uf ?? '',
  }
}
