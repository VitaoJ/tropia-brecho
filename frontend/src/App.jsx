import { Routes, Route } from 'react-router-dom'
import Home       from './pages/Home'
import Catalogo   from './pages/Catalogo'
import Produto    from './pages/Produto'
import Carrinho   from './pages/Carrinho'
import Checkout   from './pages/Checkout'
import AdminLogin from './pages/admin/Login'
import Dashboard  from './pages/admin/Dashboard'

export default function App() {
  return (
    <Routes>
      {/* Site público */}
      <Route path="/"            element={<Home />} />
      <Route path="/catalogo"    element={<Catalogo />} />
      <Route path="/produto/:id" element={<Produto />} />
      <Route path="/carrinho"    element={<Carrinho />} />
      <Route path="/checkout"    element={<Checkout />} />

      {/* Admin */}
      <Route path="/admin"       element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
