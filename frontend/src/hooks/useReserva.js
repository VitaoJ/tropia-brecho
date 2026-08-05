import { useState, useEffect, useRef, useCallback } from 'react'
import { reservarPecas, liberarPecas } from '../services/api'
import { sessaoDoCheckout } from '../utils/sessao'

/**
 * Segura as peças do carrinho enquanto a pessoa preenche o checkout.
 *
 * Devolve:
 *   estado         'reservando' | 'ok' | 'expirado' | 'erro'
 *   segundos       quanto falta, para o contador na tela
 *   indisponiveis  peças que caíram, com o motivo ('vendida' | 'reservada')
 *   renovar()      recomeça o prazo — chamar ao concluir cada etapa
 *   concluir()     avisa que virou pedido; a partir daí não solta ao sair
 */
export function useReserva(itens) {
  const [estado, setEstado] = useState('reservando')
  const [expiraEm, setExpiraEm] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const [indisponiveis, setIndisponiveis] = useState([])
  const [erro, setErro] = useState(null)

  const sessao = useRef(sessaoDoCheckout()).current
  // Vira true quando o pedido é criado: o servidor passa a segurar a peça pelo
  // tempo do pagamento, e sair da tela não pode mais devolvê-la.
  const virouPedido = useRef(false)
  const ids = itens.map(i => i.id).join(',')

  const reservar = useCallback(async () => {
    const lista = ids ? ids.split(',') : []
    if (!lista.length) return

    setEstado('reservando')
    try {
      const r = await reservarPecas(sessao, lista)
      setExpiraEm(new Date(r.expira_em))
      setIndisponiveis([])
      setEstado('ok')
    } catch (e) {
      // O 409 traz as peças que caíram; o api.js só repassa a mensagem, então
      // o checkout mostra o aviso e manda a pessoa de volta ao carrinho.
      setIndisponiveis(e.indisponiveis ?? [])
      setErro(e.message)
      setEstado('erro')
    }
  }, [ids, sessao])

  useEffect(() => { reservar() }, [reservar])

  // Contagem regressiva
  useEffect(() => {
    if (!expiraEm || estado !== 'ok') return

    const tique = () => {
      const falta = Math.max(0, Math.round((expiraEm - Date.now()) / 1000))
      setSegundos(falta)
      if (falta === 0) setEstado('expirado')
    }
    tique()
    const id = setInterval(tique, 1000)
    return () => clearInterval(id)
  }, [expiraEm, estado])

  // Devolver a peça ao sair
  useEffect(() => {
    // Fechar a aba ou o navegador. Só funciona às vezes — trocar de app no
    // celular, ficar sem sinal ou o sistema matar a aba não disparam nada.
    // Por isso o prazo no servidor é que garante, e isto é só um atalho.
    const aoFechar = () => { if (!virouPedido.current) liberarPecas(sessao) }
    window.addEventListener('pagehide', aoFechar)

    return () => {
      window.removeEventListener('pagehide', aoFechar)
      // Saiu do checkout navegando (voltou ao carrinho, clicou no logo):
      // aqui dá para devolver na hora, com certeza.
      if (!virouPedido.current) liberarPecas(sessao)
    }
  }, [sessao])

  // De propósito não existe listener de visibilitychange: no celular, sair da
  // aba é o que todo mundo faz para copiar o CPF ou abrir o app do banco.
  // Soltar a peça nisso quebraria justamente quem está comprando.

  return {
    estado,
    segundos,
    indisponiveis,
    erro,
    sessao,
    renovar: reservar,
    concluir: () => { virouPedido.current = true },
  }
}
