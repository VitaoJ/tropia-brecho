import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useReserva } from '../hooks/useReserva'
import { criarPedido } from '../services/api'
import { formatarPreco, DESCONTO_PIX } from '../utils/preco'
import {
  mascaraCPF, mascaraTelefone, mascaraCEP, soDigitos,
  validarDados, validarEndereco, buscarCEP,
} from '../utils/validacao'
import Campo from '../components/checkout/Campo'
import ContadorReserva from '../components/checkout/ContadorReserva'
import { otimizar } from '../utils/imagem'

const CONTAINER = 'max-w-5xl mx-auto px-4 md:px-8'
const RASCUNHO = 'tropia_checkout'

const ETAPAS = [
  { n: 1, nome: 'Seus dados' },
  { n: 2, nome: 'Entrega' },
  { n: 3, nome: 'Pagamento' },
]

const VAZIO = {
  nome: '', email: '', cpf: '', telefone: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
}

/* ─── Passos ─────────────────────────────────────────────────── */
// Numeração 01/02/03 como o índice da home: o checkout é parte da loja,
// não uma tela de banco que apareceu do nada.
function Passos({ atual, aoVoltar }) {
  return (
    <ol className="flex items-stretch border-y border-[#d6c8b3] mb-6 md:mb-10">
      {ETAPAS.map(({ n, nome }) => {
        const feita = n < atual
        const ativa = n === atual
        return (
          <li key={n} className="flex-1 min-w-0">
            <button
              type="button"
              disabled={!feita}
              onClick={() => feita && aoVoltar(n)}
              className={`w-full h-full text-left px-2 md:px-3 py-3 border-r border-[#d6c8b3] last:border-r-0
                transition-colors ${feita ? 'hover:bg-[#f2ead9] cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`block text-[10px] tracking-[0.16em] tabular-nums
                ${ativa ? 'text-[#250000]' : 'text-[#654a2b]/60'}`}>
                {feita ? '✓' : String(n).padStart(2, '0')}
              </span>
              <span className={`block text-[11px] md:text-xs mt-0.5 truncate
                ${ativa ? 'text-[#250000] font-medium' : 'text-[#654a2b]/70'}`}>
                {nome}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ─── Resumo ─────────────────────────────────────────────────── */
function Resumo({ itens, cupom, subtotal, descontoCupom, frete, total, forma, economiaPix }) {
  return (
    <div className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-4 flex flex-col gap-3">
      <h2 className="text-[11px] tracking-[0.16em] text-[#654a2b] uppercase">
        Seu pedido — {itens.length} {itens.length === 1 ? 'peça' : 'peças'}
      </h2>

      <ul className="flex flex-col gap-2.5">
        {itens.map(item => (
          <li key={item.id} className="flex gap-2.5 items-center">
            <div className="w-11 h-14 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
              {item.imagem && <img src={otimizar(item.imagem, 150)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-[#250000] leading-tight truncate">{item.nome}</p>
              {item.tamanho && <p className="text-[11px] text-[#654a2b]">Tam. {item.tamanho}</p>}
            </div>
            <span className="text-[13px] text-[#250000] flex-none">{formatarPreco(item.preco)}</span>
          </li>
        ))}
      </ul>

      <div className="border-t border-[#d6c8b3]" />

      <div className="flex flex-col gap-1.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-[#654a2b]">Subtotal</span>
          <span className="text-[#250000]">{formatarPreco(subtotal)}</span>
        </div>
        {cupom && (
          <div className="flex justify-between text-[#2d6a4f]">
            <span>Cupom {cupom.code}</span>
            <span>− {formatarPreco(descontoCupom)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#654a2b]">Frete</span>
          <span className="text-[#250000]">{frete === 0 ? 'Grátis' : formatarPreco(frete)}</span>
        </div>
        {forma === 'pix' && (
          <div className="flex justify-between text-[#2d6a4f]">
            <span>Desconto PIX</span>
            <span>− {formatarPreco(economiaPix)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-[#d6c8b3]" />

      <div className="flex justify-between items-baseline">
        <span className="text-sm text-[#250000]">Total</span>
        <span className="text-xl font-medium text-[#250000]">{formatarPreco(total)}</span>
      </div>
    </div>
  )
}

/* ─── Peças que caíram ───────────────────────────────────────── */
function AvisoIndisponiveis({ pecas, aoRemover }) {
  return (
    <div className="border border-[#c44b00] bg-[#fdf1e3] rounded-sm p-4 mb-6 flex flex-col gap-3">
      <p className="text-sm text-[#8a4b00] leading-relaxed">
        {pecas.length === 1
          ? 'Uma peça do seu carrinho saiu do estoque enquanto você comprava:'
          : 'Algumas peças saíram do estoque enquanto você comprava:'}
      </p>
      <ul className="flex flex-col gap-1">
        {pecas.map(p => (
          <li key={p.id} className="text-sm text-[#250000]">
            — {p.nome ?? 'Peça removida'}{' '}
            <span className="text-[11px] text-[#8a4b00]">
              ({p.motivo === 'vendida' ? 'vendida' : p.motivo === 'reservada' ? 'sendo comprada por outra pessoa' : 'removida da loja'})
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-[#8a4b00] leading-relaxed">
        Cada peça do brechó é única, então não temos outra igual. O resto do seu
        carrinho continua aqui.
      </p>
      <button onClick={aoRemover}
        className="self-start text-[11px] tracking-[0.12em] border border-[#8a4b00] text-[#8a4b00]
          px-4 py-2 rounded-sm hover:bg-[#8a4b00] hover:text-[#fdf1e3] transition-colors">
        TIRAR DO CARRINHO E SEGUIR
      </button>
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────── */
export default function Checkout() {
  const navigate = useNavigate()
  const {
    itens, cupom, quantidade, remover, limpar,
    subtotal, descontoCupom, frete, totalCartao, totalPix, economiaPix,
  } = useCart()

  const reserva = useReserva(itens)

  const [etapa, setEtapa] = useState(1)
  const [forma, setForma] = useState('pix')
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(null)
  const [caidas, setCaidas] = useState([])
  const [buscandoCep, setBuscandoCep] = useState(false)

  // O formulário sobrevive a um F5 sem querer. Também é a base da recuperação
  // de carrinho abandonado: o e-mail é o primeiro campo justamente por isso.
  const [campos, setCampos] = useState(() => {
    try { return { ...VAZIO, ...JSON.parse(localStorage.getItem(RASCUNHO) ?? '{}') } }
    catch { return VAZIO }
  })

  useEffect(() => {
    try { localStorage.setItem(RASCUNHO, JSON.stringify(campos)) } catch { /* modo privado */ }
  }, [campos])

  // Carrinho vazio não tem checkout. O ref evita que limpar o carrinho depois
  // de fechar o pedido jogue a pessoa de volta em vez de ir para a confirmação.
  const finalizado = useRef(false)
  useEffect(() => {
    if (quantidade === 0 && !finalizado.current) navigate('/carrinho', { replace: true })
  }, [quantidade, navigate])

  const total = forma === 'pix' ? totalPix : totalCartao

  const mudar = (nome, valor) => {
    const formatado =
      nome === 'cpf' ? mascaraCPF(valor)
      : nome === 'telefone' ? mascaraTelefone(valor)
      : nome === 'cep' ? mascaraCEP(valor)
      : nome === 'estado' ? valor.toUpperCase().slice(0, 2)
      : valor

    setCampos(c => ({ ...c, [nome]: formatado }))
    setErros(e => ({ ...e, [nome]: undefined }))

    if (nome === 'cep' && soDigitos(formatado).length === 8) preencherPeloCep(formatado)
  }

  async function preencherPeloCep(cep) {
    setBuscandoCep(true)
    setErros(e => ({ ...e, cep: undefined }))
    try {
      const achado = await buscarCEP(cep)
      if (!achado) {
        setErros(e => ({ ...e, cep: 'CEP não encontrado — confira ou preencha à mão' }))
        return
      }
      // Não sobrescreve o que a pessoa já digitou: quem corrigiu a rua não
      // pode ver a correção sumir ao digitar o CEP.
      setCampos(c => ({
        ...c,
        rua: c.rua || achado.rua,
        bairro: c.bairro || achado.bairro,
        cidade: achado.cidade,
        estado: achado.estado,
      }))
    } catch {
      // ViaCEP fora do ar não pode impedir a compra
      setErros(e => ({ ...e, cep: 'Não deu para consultar o CEP. Preencha o endereço à mão.' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  function avancar() {
    const achados = etapa === 1 ? validarDados(campos) : validarEndereco(campos)
    setErros(achados)
    if (Object.keys(achados).length > 0) return

    setEtapa(e => e + 1)
    // Avançar é sinal de que a pessoa está mesmo comprando: renova os 10 min.
    reserva.renovar()
  }

  function tirarCaidas() {
    caidas.forEach(p => remover(p.id))
    setCaidas([])
    setErroEnvio(null)
  }

  async function finalizar() {
    setEnviando(true)
    setErroEnvio(null)
    try {
      const { pedido } = await criarPedido({
        cliente: {
          nome: campos.nome.trim(),
          email: campos.email.trim(),
          cpf: soDigitos(campos.cpf),
          telefone: soDigitos(campos.telefone),
        },
        endereco: {
          cep: soDigitos(campos.cep),
          rua: campos.rua.trim(),
          numero: campos.numero.trim(),
          complemento: campos.complemento.trim(),
          bairro: campos.bairro.trim(),
          cidade: campos.cidade.trim(),
          estado: campos.estado.toUpperCase(),
        },
        itens: itens.map(i => i.id),
        cupom: cupom?.code ?? null,
        forma_pagamento: forma,
        sessao: reserva.sessao,
        // O servidor refaz a conta e recusa se não bater — assim ninguém paga
        // um valor diferente do que viu na tela.
        total_esperado: total,
      })

      finalizado.current = true
      reserva.concluir()
      limpar()
      try { localStorage.removeItem(RASCUNHO) } catch { /* modo privado */ }
      navigate(`/pedido/${pedido.id}`, { replace: true })
    } catch (err) {
      if (err.indisponiveis?.length) setCaidas(err.indisponiveis)
      setErroEnvio(err.message)
      setEnviando(false)
    }
  }

  if (quantidade === 0) return null

  const pecasCaidas = caidas.length ? caidas : reserva.indisponiveis

  return (
    <section className={`${CONTAINER} pt-6 md:pt-12 pb-12 md:pb-20`}>
      <h1 className="text-2xl md:text-4xl font-medium text-[#250000] mb-1">Finalizar compra</h1>
      <Link to="/carrinho" className="text-xs text-[#654a2b] underline underline-offset-4 hover:text-[#250000]">
        voltar ao carrinho
      </Link>

      <div className="mt-6 md:mt-8">
        <Passos atual={etapa} aoVoltar={setEtapa} />
      </div>

      {pecasCaidas.length > 0 && (
        <AvisoIndisponiveis pecas={pecasCaidas} aoRemover={tirarCaidas} />
      )}

      <div className="md:flex md:gap-10 lg:gap-14 md:items-start">
        {/* Formulário */}
        <div className="flex-1 min-w-0">
          {etapa === 1 && (
            <div className="flex flex-col gap-4">
              {/* E-mail primeiro: é o que permite avisar sobre o pedido e
                  retomar a compra se a pessoa parar no meio. */}
              <Campo rotulo="E-mail" nome="email" tipo="email" modo="email"
                autoComplete="email" placeholder="voce@email.com"
                valor={campos.email} aoMudar={mudar} erro={erros.email}
                dica="Enviamos a confirmação e o código de rastreio para cá." />
              <Campo rotulo="Nome completo" nome="nome" autoComplete="name"
                placeholder="Como está no documento"
                valor={campos.nome} aoMudar={mudar} erro={erros.nome} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo rotulo="CPF" nome="cpf" modo="numeric" maxLength={14}
                  placeholder="000.000.000-00"
                  valor={campos.cpf} aoMudar={mudar} erro={erros.cpf}
                  dica="Obrigatório para emitir a nota fiscal." />
                <Campo rotulo="Telefone" nome="telefone" modo="tel" maxLength={15}
                  autoComplete="tel" placeholder="(11) 90000-0000"
                  valor={campos.telefone} aoMudar={mudar} erro={erros.telefone} />
              </div>
            </div>
          )}

          {etapa === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo rotulo="CEP" nome="cep" modo="numeric" maxLength={9}
                  autoComplete="postal-code" placeholder="00000-000"
                  valor={campos.cep} aoMudar={mudar} erro={erros.cep}
                  dica={buscandoCep ? 'Buscando endereço...' : 'Preenchemos o resto para você.'} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
                <Campo rotulo="Rua" nome="rua" autoComplete="address-line1"
                  valor={campos.rua} aoMudar={mudar} erro={erros.rua} />
                <Campo rotulo="Número" nome="numero" modo="numeric"
                  valor={campos.numero} aoMudar={mudar} erro={erros.numero} />
              </div>
              <Campo rotulo="Complemento" nome="complemento"
                placeholder="Apartamento, bloco, referência (opcional)"
                valor={campos.complemento} aoMudar={mudar} />
              <Campo rotulo="Bairro" nome="bairro"
                valor={campos.bairro} aoMudar={mudar} erro={erros.bairro} />
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-4">
                <Campo rotulo="Cidade" nome="cidade"
                  valor={campos.cidade} aoMudar={mudar} erro={erros.cidade} />
                <Campo rotulo="UF" nome="estado" maxLength={2} placeholder="SP"
                  valor={campos.estado} aoMudar={mudar} erro={erros.estado} />
              </div>
              <p className="text-[11px] text-[#654a2b] leading-relaxed">
                Frete fixo de {formatarPreco(14.9)} para todo o Brasil, grátis
                acima de {formatarPreco(150)}. Enviamos em até 2 dias úteis
                depois do pagamento confirmado.
              </p>
            </div>
          )}

          {etapa === 3 && (
            <div className="flex flex-col gap-3">
              <FormaPagamento escolhida={forma} aoEscolher={setForma}
                totalPix={totalPix} totalCartao={totalCartao} economiaPix={economiaPix} />

              {erroEnvio && !pecasCaidas.length && (
                <p className="text-sm text-[#c44b00] bg-[#fdf1e3] border border-[#c44b00] rounded-sm px-3 py-2.5">
                  {erroEnvio}
                </p>
              )}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center gap-3 mt-8">
            {etapa > 1 && (
              <button type="button" onClick={() => setEtapa(e => e - 1)}
                className="h-12 px-5 border border-[#d6c8b3] text-[#654a2b] text-xs tracking-[0.12em]
                  rounded-sm hover:border-[#654a2b] transition-colors">
                VOLTAR
              </button>
            )}
            <button
              type="button"
              onClick={etapa === 3 ? finalizar : avancar}
              disabled={enviando || reserva.estado === 'expirado' || pecasCaidas.length > 0}
              className="flex-1 h-12 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.16em] rounded-sm
                hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? 'FECHANDO PEDIDO...' : etapa === 3 ? 'FINALIZAR PEDIDO' : 'CONTINUAR'}
            </button>
          </div>
        </div>

        {/* Resumo */}
        <aside className="md:w-80 flex-none mt-8 md:mt-0 md:sticky md:top-24 flex flex-col gap-3">
          <ContadorReserva estado={reserva.estado} segundos={reserva.segundos}
            aoRenovar={reserva.renovar} />
          <Resumo itens={itens} cupom={cupom} subtotal={subtotal}
            descontoCupom={descontoCupom} frete={frete} total={total}
            forma={forma} economiaPix={economiaPix} />
        </aside>
      </div>
    </section>
  )
}

/* ─── Forma de pagamento ─────────────────────────────────────── */
function FormaPagamento({ escolhida, aoEscolher, totalPix, totalCartao, economiaPix }) {
  const opcoes = [
    {
      id: 'pix',
      nome: 'PIX',
      total: totalPix,
      detalhe: `Você economiza ${formatarPreco(economiaPix)} (${DESCONTO_PIX * 100}% de desconto)`,
    },
    {
      id: 'credit_card',
      nome: 'Cartão de crédito',
      total: totalCartao,
      detalhe: 'Parcelamento definido na tela de pagamento',
    },
  ]

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-[11px] tracking-[0.16em] text-[#654a2b] uppercase mb-1">
        Como você prefere pagar?
      </legend>

      {opcoes.map(o => {
        const ativa = escolhida === o.id
        return (
          <label key={o.id}
            className={`flex items-center gap-3 p-4 rounded-sm border cursor-pointer transition-colors
              ${ativa ? 'border-[#250000] bg-[#f2ead9]' : 'border-[#d6c8b3] hover:border-[#654a2b]'}`}>
            <input type="radio" name="pagamento" value={o.id} checked={ativa}
              onChange={() => aoEscolher(o.id)} className="sr-only" />

            <span className={`w-4 h-4 rounded-full border flex-none flex items-center justify-center
              ${ativa ? 'border-[#250000]' : 'border-[#d6c8b3]'}`}>
              {ativa && <span className="w-2 h-2 rounded-full bg-[#250000]" />}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-[15px] text-[#250000]">{o.nome}</span>
              <span className={`block text-[11px] ${o.id === 'pix' ? 'text-[#2d6a4f]' : 'text-[#654a2b]'}`}>
                {o.detalhe}
              </span>
            </span>

            <span className="text-[15px] font-medium text-[#250000] flex-none">
              {formatarPreco(o.total)}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
