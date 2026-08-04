import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import logoSimbolo from '../assets/logo-simbolo.svg'
import logoTexto from '../assets/logo-texto.svg'

const LINKS = [
  { label: 'Início', path: '/' },
  { label: 'Catálogo', path: '/catalogo' },
  { label: 'Favoritos', path: '/favoritos' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { quantidade } = useCart()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 md:h-20 bg-[#eae1d4] border-b border-[#d6c8b3]">
      <div className="max-w-6xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-6">

        {/* Logo — no mobile o símbolo fica à esquerda e o wordmark centralizado */}
        <Link to="/" className="flex items-center gap-2 md:gap-3 flex-none">
          <img src={logoSimbolo} alt="" className="h-8 w-8 md:h-11 md:w-11 object-contain" />
          <img src={logoTexto} alt="Tropia" className="hidden md:block h-8 object-contain" />
        </Link>

        <img src={logoTexto} alt="Tropia"
          className="md:hidden h-7 object-contain absolute left-1/2 -translate-x-1/2" />

        {/* Links — só no desktop, onde não existe a barra inferior */}
        <div className="hidden md:flex items-center gap-8 text-xs tracking-[0.16em]">
          {LINKS.map(l => (
            <Link key={l.path} to={l.path}
              className={`uppercase transition-colors ${pathname === l.path ? 'text-[#250000]' : 'text-[#654a2b] hover:text-[#250000]'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-5 flex-none">
          <button aria-label="Buscar" className="hover:opacity-70 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <Link to="/carrinho" aria-label="Carrinho" className="relative hover:opacity-70 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {quantidade > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#ffc509] text-[#250000] text-[9px] font-medium">
                {quantidade}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
