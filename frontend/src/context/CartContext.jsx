import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { calcularFrete, precoComPix } from '../utils/preco'
import { buscarProduto } from '../services/api'

const CartContext = createContext()
const CHAVE = 'tropia_carrinho'
const CHAVE_CUPOM = 'tropia_cupom'

export function CartProvider({ children }) {
  const [itens, setItens] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE)) ?? [] } catch { return [] }
  })
  const [cupom, setCupom] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_CUPOM)) } catch { return null }
  })

  useEffect(() => { localStorage.setItem(CHAVE, JSON.stringify(itens)) }, [itens])

  /**
   * Re-sincroniza o preço das peças do carrinho ao abrir o site.
   *
   * O carrinho vive no localStorage e sobrevive a dias. Sem isto, o preço
   * gravado quando a peça entrou fica congelado: se ele mudar no painel, o
   * cliente monta o pedido com o valor antigo, o servidor recusa com "o valor
   * do pedido mudou" — e tentar de novo NUNCA resolve, porque o resumo
   * continua mostrando o preço velho. Era um beco sem saída no checkout.
   *
   * Roda uma vez, na montagem. Peça adicionada depois já entra com o preço
   * do momento. Falha em silêncio: sem rede, o carrinho continua com o que
   * tinha, e a trava do servidor segue de pé como última defesa.
   */
  useEffect(() => {
    const guardados = (() => {
      try { return JSON.parse(localStorage.getItem(CHAVE)) ?? [] } catch { return [] }
    })()
    if (guardados.length === 0) return

    let vivo = true
    Promise.all(guardados.map(i =>
      buscarProduto(i.id).then(r => r.produto).catch(() => null)
    )).then(atuais => {
      if (!vivo) return
      setItens(prev => prev.map(item => {
        const atual = atuais.find(p => p && p.id === item.id)
        if (!atual) return item                      // sumiu: o checkout avisa
        const preco = Number(atual.price)
        return Number.isFinite(preco) && preco !== Number(item.preco)
          ? { ...item, preco }
          : item
      }))
    })
    return () => { vivo = false }
  }, [])
  useEffect(() => {
    if (cupom) localStorage.setItem(CHAVE_CUPOM, JSON.stringify(cupom))
    else localStorage.removeItem(CHAVE_CUPOM)
  }, [cupom])

  // Cada peça do brechó é única: adicionar de novo não duplica nem soma quantidade.
  const adicionar = (peca) => {
    setItens(prev => prev.some(i => i.id === peca.id) ? prev : [...prev, peca])
  }

  const remover = (id) => setItens(prev => prev.filter(i => i.id !== id))

  const limpar = () => { setItens([]); setCupom(null) }

  const temNoCarrinho = (id) => itens.some(i => i.id === id)

  const totais = useMemo(() => {
    const subtotal = itens.reduce((s, i) => s + Number(i.preco), 0)
    const descontoCupom = cupom ? subtotal * (cupom.discount_percent / 100) : 0
    const comCupom = subtotal - descontoCupom
    const frete = itens.length === 0 ? 0 : calcularFrete(comCupom)

    return {
      subtotal,
      descontoCupom,
      frete,
      // Cupom e PIX se acumulam: o PIX incide sobre o valor já com cupom.
      totalCartao: comCupom + frete,
      totalPix: precoComPix(comCupom) + frete,
      economiaPix: comCupom - precoComPix(comCupom),
    }
  }, [itens, cupom])

  return (
    <CartContext.Provider value={{
      itens, cupom, setCupom, adicionar, remover, limpar,
      temNoCarrinho, quantidade: itens.length, ...totais,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
