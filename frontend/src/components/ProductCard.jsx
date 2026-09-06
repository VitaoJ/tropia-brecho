import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import { useCart } from '../context/CartContext'
import { formatarPreco } from '../utils/preco'
import { otimizar, fontes } from '../utils/imagem'

// Favoritos antigos guardaram o preço já formatado; aceita os dois formatos.
const exibirPreco = (valor) =>
  typeof valor === 'number' ? formatarPreco(valor) : valor

// Só liga o hover em quem tem ponteiro de verdade. No celular o toque também
// dispara mouseenter, e aí a foto trocaria sozinha brigando com o arrasto.
const temPonteiro = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches

export default function ProductCard({ produto, aoRemover }) {
  const { toggle, isFavorito } = useFavoritos()
  const { adicionar, temNoCarrinho } = useCart()

  const favorito = isFavorito(produto.id)
  const noCarrinho = temNoCarrinho(produto.id)

  // Fotos que o card pode mostrar. Cai para a capa quando a peça só tem uma.
  const fotos = (produto.imagens?.length ? produto.imagens : [produto.imagem]).filter(Boolean)
  const varias = fotos.length > 1

  const [idx, setIdx] = useState(0)
  // As fotos extras só entram no DOM depois do primeiro contato. Sem isso,
  // um catálogo de 12 peças baixaria 12 imagens que talvez ninguém veja.
  const [ativou, setAtivou] = useState(false)
  const toqueX = useRef(null)
  const toqueY = useRef(null)
  const arrastou = useRef(false)

  const acordar = () => { if (varias && !ativou) setAtivou(true) }

  const aoTocar = (e) => {
    acordar()
    toqueX.current = e.touches[0].clientX
    toqueY.current = e.touches[0].clientY
    arrastou.current = false
  }

  // Só assume o gesto quando ele é claramente horizontal — senão o card
  // roubaria a rolagem vertical da página, que é o movimento principal.
  const aoMover = (e) => {
    if (toqueX.current === null) return
    const dx = e.touches[0].clientX - toqueX.current
    const dy = e.touches[0].clientY - toqueY.current
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) arrastou.current = true
  }

  const aoSoltar = (e) => {
    if (toqueX.current === null) return
    const dx = e.changedTouches[0].clientX - toqueX.current
    if (arrastou.current && Math.abs(dx) > 35 && varias) {
      setIdx(i => (i + (dx < 0 ? 1 : -1) + fotos.length) % fotos.length)
    }
    toqueX.current = null
  }

  // Depois de arrastar, o dedo não deve abrir a peça: o gesto era ver a foto.
  const aoClicarNaFoto = (e) => { if (arrastou.current) { e.preventDefault(); arrastou.current = false } }

  const mouse = temPonteiro() ? {
    onMouseEnter: () => { acordar(); if (varias) setIdx(1) },
    onMouseLeave: () => setIdx(0),
  } : {}

  return (
    <article className="group relative flex flex-col">
      <Link to={`/produto/${produto.id}`} className="block" onClick={aoClicarNaFoto}>
        <div
          /* Quadrado com a peça inteira dentro, em vez de 3:4 recortando.
             O acervo tem foto em pé (4:5) e deitada (4:3) misturadas, e
             qualquer moldura fixa com object-cover corta uma das duas — na
             deitada sumia quase metade da largura. O fundo é o mesmo bege do
             site, então a sobra ao redor não vira moldura visível. */
          className="relative rounded-sm mb-2 overflow-hidden bg-[#eae1d4]"
          style={{ aspectRatio: '1/1' }}
          {...mouse}
          onTouchStart={aoTocar} onTouchMove={aoMover} onTouchEnd={aoSoltar}
        >
          {(ativou ? fotos : fotos.slice(0, 1)).map((f, i) => (
            <img key={f}
              src={otimizar(f, 400)}
              srcSet={fontes(f, [300, 400, 500, 650, 800])}
              /* 4 colunas no desktop, 2 no celular */
              sizes="(min-width: 768px) 24vw, 47vw"
              alt={i === 0 ? produto.nome : `${produto.nome} — detalhe`}
              loading="lazy" draggable="false"
              className={`absolute inset-0 w-full h-full object-contain
                transition-opacity duration-500 ease-out
                ${i === idx ? 'opacity-100' : 'opacity-0'}`} />
          ))}

          {produto.desconto ? (
            <span className="absolute top-2 left-2 text-[9px] md:text-[10px] tracking-[0.15em] bg-[#ffc509] text-[#250000] px-2 py-0.5 font-medium">
              −{produto.desconto.percentual}%
            </span>
          ) : produto.novo && (
            <span className="absolute top-2 left-2 text-[9px] md:text-[10px] tracking-[0.15em] bg-[#250000] text-[#eae1d4] px-2 py-0.5">
              NOVO
            </span>
          )}

          {/* Marcas de quantas fotos existem. É a única pista de que dá para
              arrastar — no celular não há hover para insinuar isso. */}
          {varias && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {fotos.map((_, i) => (
                <span key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300
                    ${i === idx ? 'bg-[#eae1d4]' : 'bg-[#eae1d4]/40'}`} />
              ))}
            </span>
          )}
        </div>

        <p className="text-[#250000] leading-tight text-[0.95rem] md:text-base">
          {produto.nome}
        </p>
        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <span className="text-[10px] md:text-[11px] text-[#654a2b]">
            {produto.tamanho ? `Tam. ${produto.tamanho}` : ' '}
          </span>
          <span className="flex items-baseline gap-1.5">
            {produto.desconto && (
              <span className="text-[10px] md:text-[11px] text-[#654a2b] line-through">
                {formatarPreco(produto.desconto.precoAntes)}
              </span>
            )}
            <span className="text-xs md:text-sm font-medium text-[#250000]">
              {exibirPreco(produto.preco)}
            </span>
          </span>
        </div>
      </Link>

      <button aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={() => (aoRemover ? aoRemover(produto) : toggle(produto))}
        className="absolute top-2 right-2 p-1 -m-1">
        <svg width="16" height="16" className="md:w-[18px] md:h-[18px]" viewBox="0 0 24 24"
          fill={favorito ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      {/* Depois de adicionar, o botão vira caminho para o carrinho em vez de
          repetir a ação: a peça é única, clicar de novo não faz nada. */}
      {produto.vendida ? (
        <span className="mt-4 self-center h-9 px-5 flex items-center border border-[#d6c8b3]
          text-[10px] tracking-[0.16em] text-[#654a2b] rounded-sm">
          VENDIDA
        </span>
      ) : noCarrinho ? (
        <Link to="/carrinho"
          className="mt-4 self-center h-9 px-5 flex items-center gap-1.5 bg-[#f2ead9] border border-[#250000]
            text-[10px] tracking-[0.16em] text-[#250000] rounded-sm hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
          ✓ NO CARRINHO
        </Link>
      ) : (
        <button
          onClick={() => adicionar({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            tamanho: produto.tamanho ?? null,
            imagem: produto.imagem ?? null,
            categoriaSlug: produto.categoriaSlug ?? null,
            genero: produto.genero ?? null,
          })}
          className="mt-4 self-center h-9 px-5 bg-[#250000] text-[#eae1d4] text-[10px] tracking-[0.16em]
            rounded-sm hover:bg-[#432d1c] transition-colors">
          COMPRAR
        </button>
      )}
    </article>
  )
}
