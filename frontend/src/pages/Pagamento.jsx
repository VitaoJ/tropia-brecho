import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { buscarPedidoPublico, configPagamento, processarPagamento, statusPagamento, formatarPreco } from '../services/api'
import { carregarSdk } from '../utils/brickMercadoPago'

const CONTAINER = 'max-w-2xl mx-auto px-4 md:px-8'
const CAIXA = 'border border-[#d6c8b3] rounded-sm bg-[#f2ead9]'

/* Enquanto o PIX não cai, perguntamos de tempos em tempos. Não é elegante,
   mas é o único jeito de a tela saber: quem avisa a loja é o webhook, no
   servidor, e o navegador não é avisado de nada. */
const INTERVALO_CONSULTA = 4000

/* O Brick nem sempre avisa que falhou: com chave errada ou Mercado Pago fora
   do ar ele registra o erro no console e nunca chama onReady nem onError, e a
   tela ficaria girando para sempre — na tela de pagar, que é a pior possível
   para isso. Passado este tempo sem ficar pronto, assumimos que não vem. */
const ESPERA_MAXIMA = 15000

function Carregando({ texto }) {
  return (
    <div className="flex items-center gap-3 text-[14px] text-[#654a2b] py-8">
      <span className="w-4 h-4 border-2 border-[#d6c8b3] border-t-[#250000] rounded-full animate-spin" />
      {texto}
    </div>
  )
}

function Erro({ titulo, children }) {
  return (
    <div className="border border-[#e0a45c] bg-[#fdf1e3] rounded-sm p-4 md:p-5">
      <p className="text-[14px] font-medium text-[#8a4b00] mb-1">{titulo}</p>
      <div className="text-[13px] leading-relaxed text-[#8a4b00]/90">{children}</div>
    </div>
  )
}

/* ─── PIX ────────────────────────────────────────────────────────────
   O QR e o copia-e-cola vêm prontos do Mercado Pago. A tela não calcula
   nada: só mostra e fica perguntando se caiu.                        */
function Pix({ dados, aoCair, pedidoId }) {
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const { status } = await statusPagamento(pedidoId)
        if (status === 'paid') aoCair()
      } catch { /* rede piscou; a próxima volta tenta de novo */ }
    }, INTERVALO_CONSULTA)
    return () => clearInterval(t)
  }, [pedidoId, aoCair])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dados.qr_code)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch { /* sem permissão: o código fica à vista para copiar à mão */ }
  }

  return (
    <div className={`${CAIXA} p-4 md:p-6 text-center`}>
      <p className="text-[10px] tracking-[0.2em] text-[#654a2b] uppercase mb-4">Pague com PIX</p>

      {dados.qr_code_base64 && (
        <img src={`data:image/png;base64,${dados.qr_code_base64}`}
          alt="QR Code do PIX" width="220" height="220"
          className="mx-auto mb-4 bg-white p-2 rounded-sm" />
      )}

      <p className="text-[13px] text-[#654a2b] mb-3 leading-relaxed">
        Abra o app do banco, escolha PIX e leia o código. Assim que o
        pagamento cair, esta tela muda sozinha.
      </p>

      {dados.qr_code && (
        <>
          <p className="text-[11px] text-[#250000] break-all bg-[#eae1d4] rounded-sm p-3 mb-3 text-left font-mono leading-relaxed">
            {dados.qr_code}
          </p>
          <button onClick={copiar}
            className="w-full h-11 bg-[#250000] text-[#eae1d4] text-[13px] tracking-[0.1em] rounded-sm
              hover:bg-[#432d1c] transition-colors">
            {copiado ? 'Código copiado' : 'Copiar código'}
          </button>
        </>
      )}

      <div className="flex items-center justify-center gap-2 mt-4 text-[12px] text-[#654a2b]">
        <span className="w-3 h-3 border-2 border-[#d6c8b3] border-t-[#654a2b] rounded-full animate-spin" />
        Aguardando o pagamento
      </div>
    </div>
  )
}

export default function Pagamento() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [pedido, setPedido] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [pix, setPix] = useState(null)
  const [recusado, setRecusado] = useState(null)

  const caixa = useRef(null)
  const brick = useRef(null)
  const pedidoRef = useRef(null)
  // O vigia roda depois, num closure: sem a ref ele leria o `carregando` de
  // quando o timer foi criado e reclamaria de um formulário que já apareceu.
  const carregandoRef = useRef(true)
  useEffect(() => { carregandoRef.current = carregando }, [carregando])

  const irParaPedido = () => navigate(`/pedido/${id}`, { replace: true })

  // ── Carrega o pedido e monta o Brick ──────────────────────────────
  useEffect(() => {
    let vivo = true
    let vigia = null

    async function montar() {
      try {
        const [{ pedido: p }, config] = await Promise.all([
          buscarPedidoPublico(id),
          configPagamento(),
        ])
        if (!vivo) return

        pedidoRef.current = p
        setPedido(p)

        // Pedido que já andou não se paga de novo.
        if (p.status !== 'pending') return irParaPedido()

        if (!config.ativo) {
          setErro('pagamento-desligado')
          return
        }

        const MercadoPago = await carregarSdk()
        if (!vivo) return

        const mp = new MercadoPago(config.chave_publica, { locale: 'pt-BR' })

        vigia = setTimeout(() => {
          if (!vivo || !carregandoRef.current) return
          setCarregando(false)
          setErro('O formulário de pagamento não respondeu.')
        }, ESPERA_MAXIMA)

        // O Brick só oferece o meio que o pedido combinou. Quem escolheu PIX
        // levou desconto; deixar o cartão à mão aqui seria oferecer um
        // caminho que o servidor vai recusar depois.
        //
        // Desligar um meio é OMITIR a chave. Não existe valor "none": passar
        // isso faz o Mercado Pago recusar a configuração inteira com
        // "Payment Method (ticket): [none] is invalid", e o Brick nem monta —
        // a tela fica no erro genérico dele. Aqui se lista só o que entra.
        const meios = p.forma_pagamento === 'pix'
          ? { bankTransfer: 'all' }
          : { creditCard: 'all', debitCard: 'all' }

        brick.current = await mp.bricks().create('payment', 'brick-pagamento', {
          initialization: { amount: p.total },
          customization: {
            paymentMethods: meios,
            visual: { style: { theme: 'default' } },
          },
          callbacks: {
            onReady: () => { clearTimeout(vigia); if (vivo) setCarregando(false) },
            onSubmit: ({ formData }) => enviar(formData),
            onError: (e) => {
              console.error('Brick do Mercado Pago:', e)
              if (vivo) setCarregando(false)
            },
          },
        })
      } catch (err) {
        console.error('Montagem do pagamento:', err)
        if (vivo) { setErro(err.message || 'falha'); setCarregando(false) }
      }
    }

    montar()

    return () => {
      vivo = false
      clearTimeout(vigia)
      // O Brick precisa ser desmontado à mão: ele vive fora do React e
      // sobreviveria à troca de tela, deixando um formulário órfão.
      try { brick.current?.unmount() } catch { /* já foi */ }
      brick.current = null
    }
  }, [id])

  /**
   * Manda o pagamento para o servidor.
   *
   * Devolve uma Promise porque é o que o Brick espera: resolver limpa o
   * estado de "enviando" dele, rejeitar deixa a pessoa corrigir e tentar de
   * novo sem remontar o formulário.
   */
  async function enviar(formData) {
    setRecusado(null)
    try {
      const r = await processarPagamento(id, formData)

      if (r.pix) { setPix(r.pix); return }
      if (r.status === 'approved') { irParaPedido(); return }

      if (r.status === 'in_process' || r.status === 'pending') {
        setRecusado({
          titulo: 'Pagamento em análise',
          texto: 'O Mercado Pago está conferindo. Assim que liberar, seu pedido é confirmado e você recebe um e-mail. A peça fica reservada nesse meio-tempo.',
        })
        return
      }

      setRecusado({
        titulo: 'Pagamento não aprovado',
        texto: 'O banco recusou esta tentativa. Confira os dados ou tente outro cartão — a peça continua reservada.',
      })
      throw new Error('recusado')   // mantém o formulário para nova tentativa
    } catch (err) {
      if (err.message !== 'recusado') {
        setRecusado({
          titulo: 'Não deu para concluir',
          texto: err.message || 'Tente de novo em instantes. Nada foi cobrado.',
        })
      }
      throw err
    }
  }

  if (erro === 'pagamento-desligado') {
    return (
      <section className={`${CONTAINER} py-12 md:py-20`}>
        <Erro titulo="Pagamento indisponível">
          O pagamento online ainda não está ligado nesta loja. Seu pedido{' '}
          <strong>{pedido?.numero}</strong> está guardado — fale com a gente pelo{' '}
          <Link to="/contato" className="underline">contato</Link> para combinar.
        </Erro>
      </section>
    )
  }

  return (
    <section className={`${CONTAINER} py-8 md:py-16`}>
      <p className="text-[10px] md:text-[11px] tracking-[0.32em] text-[#654a2b] uppercase mb-3">
        Pagamento
      </p>
      <h1 className="font-black italic tracking-[-0.04em] leading-[0.9] text-[#250000] mb-2"
        style={{ fontSize: 'clamp(1.75rem, 7vw, 3rem)' }}>
        Falta pagar.
      </h1>

      {pedido && (
        <p className="text-[14px] text-[#654a2b] mb-6 md:mb-8">
          Pedido <strong className="text-[#250000]">{pedido.numero}</strong> ·{' '}
          <strong className="text-[#250000]">{formatarPreco(pedido.total)}</strong>
        </p>
      )}

      {recusado && (
        <div className="mb-5">
          <Erro titulo={recusado.titulo}>{recusado.texto}</Erro>
        </div>
      )}

      {pix
        ? <Pix dados={pix} pedidoId={id} aoCair={irParaPedido} />
        : (
          <>
            {carregando && <Carregando texto="Preparando o pagamento seguro…" />}
            {erro && erro !== 'pagamento-desligado' && (
              <Erro titulo="Não foi possível abrir o pagamento">
                {erro} — recarregue a página. Seu pedido está guardado e a peça
                continua reservada.
              </Erro>
            )}
            {/* O Brick monta aqui dentro. O div precisa existir antes da
                chamada, por isso ele não é condicional. */}
            <div id="brick-pagamento" ref={caixa} />
          </>
        )}

      <p className="text-[12px] text-[#654a2b] leading-relaxed mt-6">
        Os dados do cartão vão direto para o Mercado Pago — eles não passam
        pelo servidor da Tropia.
      </p>
    </section>
  )
}
