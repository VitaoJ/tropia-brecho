import { Link } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import { useCart } from '../context/CartContext'
import { formatarPreco } from '../utils/preco'
import { otimizar, fontes } from '../utils/imagem'

// Favoritos antigos guardaram o preço já formatado; aceita os dois formatos.
const exibirPreco = (valor) =>
  typeof valor === 'number' ? formatarPreco(valor) : valor

export default function ProductCard({ produto, aoRemover }) {
  const { toggle, isFavorito } = useFavoritos()
  const { adicionar, temNoCarrinho } = useCart()

  const favorito = isFavorito(produto.id)
  const noCarrinho = temNoCarrinho(produto.id)

  // O card fica dentro de <article> e não de <a>: botão dentro de link é HTML
  // inválido e quebra a navegação por teclado. O link cobre a foto e o texto;
  // favoritar e comprar ficam por fora.
  return (
    <article className="group relative flex flex-col">
      <Link to={`/produto/${produto.id}`} className="block">
        <div className="relative rounded-sm mb-2 overflow-hidden bg-[#d6c8b3]" style={{ aspectRatio: '3/4' }}>
          {produto.imagem && (
            <img
              src={otimizar(produto.imagem, 400)}
              srcSet={fontes(produto.imagem, [300, 400, 500, 650, 800])}
              /* 4 colunas no desktop, 2 no celular */
              sizes="(min-width: 768px) 24vw, 47vw"
              alt={produto.nome} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}

          {produto.desconto ? (
            <span className="absolute top-2 left-2 text-[9px] md:text-[10px] tracking-[0.15em] bg-[#ffc509] text-[#250000] px-2 py-0.5 font-medium">
              −{produto.desconto.percentual}%
            </span>
          ) : produto.novo && (
            <span className="absolute top-2 left-2 text-[9px] md:text-[10px] tracking-[0.15em] bg-[#250000] text-[#eae1d4] px-2 py-0.5">
              NOVO
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
        <span className="mt-2 h-9 flex items-center justify-center border border-[#d6c8b3]
          text-[10px] tracking-[0.16em] text-[#654a2b] rounded-sm">
          VENDIDA
        </span>
      ) : noCarrinho ? (
        <Link to="/carrinho"
          className="mt-2 h-9 flex items-center justify-center gap-1.5 bg-[#f2ead9] border border-[#250000]
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
          className="mt-2 h-9 bg-[#250000] text-[#eae1d4] text-[10px] tracking-[0.16em]
            rounded-sm hover:bg-[#432d1c] transition-colors">
          COMPRAR
        </button>
      )}
    </article>
  )
}
