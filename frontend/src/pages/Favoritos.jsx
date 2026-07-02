import { useNavigate } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import logoSimbolo from '../assets/logo-simbolo.svg'
import logoTexto from '../assets/logo-texto.svg'

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-[#f5f2ee] border-b border-[#ddd8d0]"
      style={{ maxWidth: 500, margin: '0 auto', left: 'inherit', right: 'inherit', width: '100%' }}>
      <img src={logoSimbolo} alt="Tropia símbolo" className="h-8 w-8 object-contain" />
      <img src={logoTexto} alt="Tropia" className="h-7 object-contain" />
      <div style={{ width: 32 }} />
    </nav>
  )
}

function BottomNav() {
  const navigate = useNavigate()
  const NAV = [
    { label: 'Home', path: '/', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { label: 'Catálogo', path: '/catalogo', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { label: 'Favoritos', path: '/favoritos', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a1a18" stroke="#1a1a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { label: 'Carrinho', path: '/carrinho', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
  ]
  return (
    <nav className="fixed bottom-0 z-50 flex items-center justify-around bg-[#f5f2ee] border-t border-[#ddd8d0]"
      style={{ height: 60, maxWidth: 500, width: '100%' }}>
      {NAV.map((item) => (
        <button key={item.label} onClick={() => navigate(item.path)}
          className="flex flex-col items-center gap-0.5 pt-2 pb-1 px-3">
          {item.icon}
          <span className="text-[9px] tracking-[0.1em]"
            style={{ fontFamily: "'DM Sans', sans-serif", color: item.path === '/favoritos' ? '#1a1a18' : '#8c8278' }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

export default function Favoritos() {
  const navigate = useNavigate()
  const { favoritos, toggle } = useFavoritos()

  return (
    <div className="min-h-screen bg-[#f5f2ee]">
      <Navbar />
      <main className="pt-14 px-4 pb-24">
        <h2 className="text-xs tracking-[0.2em] text-[#8c8278] uppercase mt-6 mb-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Favoritos
        </h2>

        {favoritos.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd8d0" strokeWidth="1.4">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <p className="text-sm text-[#8c8278] text-center"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Nenhuma peça favoritada ainda.
            </p>
            <button onClick={() => navigate('/catalogo')}
              className="text-xs tracking-[0.14em] border border-[#1a1a18] px-5 py-2.5 text-[#1a1a18]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              EXPLORAR CATÁLOGO
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoritos.map((p) => (
              <div key={p.id} className="cursor-pointer" onClick={() => navigate(`/produto/${p.id}`)}>
                <div className="relative rounded-sm mb-2 overflow-hidden"
                  style={{ aspectRatio: '3/4', background: p.cor ?? '#ddd8d0' }}>
                  <button className="absolute top-2 right-2" aria-label="Remover favorito"
                    onClick={(e) => { e.stopPropagation(); toggle(p) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a1a18" stroke="#1a1a18" strokeWidth="1.6">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
                <p className="text-sm leading-tight text-[#1a1a18]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem' }}>
                  {p.nome}
                </p>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-[#8c8278]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Tam. {p.tamanho}
                  </span>
                  <span className="text-xs text-[#1a1a18]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    R$ {p.preco}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
