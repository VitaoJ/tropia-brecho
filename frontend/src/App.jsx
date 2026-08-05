import { Routes, Route } from 'react-router-dom'
import Home       from './pages/Home'
import Catalogo   from './pages/Catalogo'
import Produto    from './pages/Produto'
import Carrinho   from './pages/Carrinho'
import Checkout   from './pages/Checkout'
import PedidoConfirmado from './pages/PedidoConfirmado'
import Favoritos  from './pages/Favoritos'
import AdminLogin from './pages/admin/Login'
import Dashboard  from './pages/admin/Dashboard'
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Site público — navbar no topo e, no mobile, barra inferior */}
        <Route path="/"            element={<Layout><Home /></Layout>} />
        <Route path="/catalogo"    element={<Layout><Catalogo /></Layout>} />
        <Route path="/produto/:id" element={<Layout><Produto /></Layout>} />
        <Route path="/carrinho"    element={<Layout><Carrinho /></Layout>} />
        <Route path="/checkout"    element={<Layout><Checkout /></Layout>} />
        <Route path="/pedido/:id"  element={<Layout><PedidoConfirmado /></Layout>} />
        <Route path="/favoritos"   element={<Layout><Favoritos /></Layout>} />

        {/* Admin — layout próprio */}
        <Route path="/admin"           element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  )
}
