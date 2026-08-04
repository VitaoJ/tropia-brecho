import { Link } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import ProductCard from '../components/ProductCard'

export default function Favoritos() {
  const { favoritos, toggle } = useFavoritos()

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-12 pb-12 md:pb-20">
      <h1 className="text-xs md:text-sm tracking-[0.2em] text-[#654a2b] uppercase mb-4 md:mb-8">
        Favoritos
      </h1>

      {favoritos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d6c8b3" strokeWidth="1.4">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p className="text-sm text-[#654a2b] text-center">Nenhuma peça favoritada ainda.</p>
          <Link to="/catalogo"
            className="text-xs tracking-[0.14em] border border-[#250000] px-5 py-2.5 text-[#250000] hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
            EXPLORAR CATÁLOGO
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {favoritos.map(p => (
            <ProductCard key={p.id} produto={p} aoRemover={toggle} />
          ))}
        </div>
      )}
    </section>
  )
}
