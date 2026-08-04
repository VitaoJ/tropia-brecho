import Navbar from './Navbar'
import BottomNav from './BottomNav'

// Espaçamentos compensam a navbar fixa no topo e, no mobile, a barra inferior.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#eae1d4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />
      <main className="pt-14 md:pt-20 pb-[60px] md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
