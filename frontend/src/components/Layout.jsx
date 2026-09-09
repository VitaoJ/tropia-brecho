import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Rodape from './Rodape'

// Espaçamentos compensam a navbar fixa no topo e, no mobile, a barra inferior.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#eae1d4]">
      {/* A barra de frete grátis mora dentro da Navbar, logo abaixo dela, para
          acompanhar a rolagem junto do cabeçalho. */}
      <Navbar />
      <main className="pb-[60px] md:pb-0">
        {children}
      </main>
      <Rodape />
      <BottomNav />
    </div>
  )
}
