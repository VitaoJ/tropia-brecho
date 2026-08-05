import { Link } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import { formatarPreco } from '../utils/preco'
import { otimizar } from '../utils/imagem'

// Favoritos antigos guardaram o preço já formatado; aceita os dois formatos.
const exibirPreco = (valor) =>
  typeof valor === 'number' ? formatarPreco(valor) : valor

export default function ProductCard({ produto, aoRemover }) {
  const { toggle, isFavorito } = useFavoritos()
  const favorito = isFavorito(produto.id)

  return (
    <Link to={`/produto/${produto.id}`} className="group block">
      <div className="relative rounded-sm mb-2 overflow-hidden bg-[#d6c8b3]" style={{ aspectRatio: '3/4' }}>
        {produto.imagem && (
          <img src={otimizar(produto.imagem, 600)} alt={produto.nome} loading="lazy"
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

        <button aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar'}
          onClick={(e) => {
            e.preventDefault()
            aoRemover ? aoRemover(produto) : toggle(produto)
          }}
          className="absolute top-2 right-2 p-1 -m-1">
          <svg width="16" height="16" className="md:w-[18px] md:h-[18px]" viewBox="0 0 24 24"
            fill={favorito ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <p className="text-[#250000] leading-tight text-[0.95rem] md:text-base">
        {produto.nome}
      </p>
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <span className="text-[10px] md:text-[11px] text-[#654a2b]">
          {produto.tamanho ? `Tam. ${produto.tamanho}` : ' '}
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
  )
}
