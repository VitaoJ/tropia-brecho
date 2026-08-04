import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const icones = {
  home: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  grade: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  coracao: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#250000' : 'none'} stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  sacola: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
}

const ITENS = [
  { label: 'Início', path: '/', icone: 'home' },
  { label: 'Catálogo', path: '/catalogo', icone: 'grade' },
  { label: 'Favoritos', path: '/favoritos', icone: 'coracao' },
  { label: 'Carrinho', path: '/carrinho', icone: 'sacola' },
]

// Só no mobile — no desktop a navegação fica na barra superior
export default function BottomNav() {
  const { pathname } = useLocation()
  const { quantidade } = useCart()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-[60px] bg-[#eae1d4] border-t border-[#d6c8b3] flex items-center justify-around">
      {ITENS.map(item => {
        const ativo = pathname === item.path
        return (
          <Link key={item.path} to={item.path}
            className="flex flex-col items-center gap-0.5 pt-2 pb-1 px-3 relative">
            {icones[item.icone](ativo)}
            {item.path === '/carrinho' && quantidade > 0 && (
              <span className="absolute top-1 right-1.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-[#ffc509] text-[#250000] text-[9px] font-medium"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {quantidade}
              </span>
            )}
            <span className="text-[9px] tracking-[0.1em]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: ativo ? '#250000' : '#654a2b' }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
