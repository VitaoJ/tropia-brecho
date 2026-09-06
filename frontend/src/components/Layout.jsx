import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Rodape from './Rodape'
import BarraFreteGratis from './BarraFreteGratis'

// Espaçamentos compensam a navbar fixa no topo e, no mobile, a barra inferior.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#eae1d4]">
      {/* A barra rola junto: fixá-la roubaria altura de tela no celular,
          que é onde a página tem menos espaço. */}
      <BarraFreteGratis />
      <Navbar />
      <main className="pb-[60px] md:pb-0">
        {children}
      </main>
      <Rodape />
      <BottomNav />
    </div>
  )
}
