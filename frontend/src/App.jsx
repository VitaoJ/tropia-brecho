import { Routes, Route } from 'react-router-dom'
import Home       from './pages/Home'
import Catalogo   from './pages/Catalogo'
import Produto    from './pages/Produto'
import Carrinho   from './pages/Carrinho'
import Checkout   from './pages/Checkout'
import AdminLogin from './pages/admin/Login'
import Dashboard  from './pages/admin/Dashboard'

function MobileContainer({ children }) {
  return (
    <div className="min-h-screen bg-[#e8e2d8] flex justify-center">
      <div className="w-full bg-[#f5f2ee]" style={{ maxWidth: 500 }}>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Site público — centralizado em 500px */}
      <Route path="/"            element={<MobileContainer><Home /></MobileContainer>} />
      <Route path="/catalogo"    element={<MobileContainer><Catalogo /></MobileContainer>} />
      <Route path="/produto/:id" element={<MobileContainer><Produto /></MobileContainer>} />
      <Route path="/carrinho"    element={<MobileContainer><Carrinho /></MobileContainer>} />
      <Route path="/checkout"    element={<MobileContainer><Checkout /></MobileContainer>} />

      {/* Admin — sem container */}
      <Route path="/admin"           element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
