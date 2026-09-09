import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Home       from './pages/Home'
import Catalogo   from './pages/Catalogo'
import Produto    from './pages/Produto'
import Carrinho   from './pages/Carrinho'
import Checkout   from './pages/Checkout'
import Pagamento  from './pages/Pagamento'
import PedidoConfirmado from './pages/PedidoConfirmado'
import QuemSomos  from './pages/QuemSomos'
import Upcycling  from './pages/Upcycling'
import Contato    from './pages/Contato'
import Favoritos  from './pages/Favoritos'
// O painel entra por carregamento tardio: ele traz junto os componentes do
// shadcn (Radix, cva, ícones), que ninguém que só quer comprar precisa
// baixar. São ~26 kB comprimidos que saem do caminho do cliente.
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const Dashboard  = lazy(() => import('./pages/admin/Dashboard'))
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'

/* O painel é do dono e abre em rede boa; um aviso simples basta. */
function TelaCarregando() {
  return (
    <div className="min-h-screen bg-[#eae1d4] flex items-center justify-center">
      <p className="text-sm text-[#654a2b]">Carregando o painel…</p>
    </div>
  )
}

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
        <Route path="/pagamento/:id" element={<Layout><Pagamento /></Layout>} />
        <Route path="/pedido/:id"  element={<Layout><PedidoConfirmado /></Layout>} />
        <Route path="/favoritos"   element={<Layout><Favoritos /></Layout>} />
        <Route path="/upcycling"   element={<Layout><Upcycling /></Layout>} />
        <Route path="/quem-somos"  element={<Layout><QuemSomos /></Layout>} />
        <Route path="/contato"     element={<Layout><Contato /></Layout>} />

        {/* Admin — layout próprio */}
        <Route path="/admin"           element={<Suspense fallback={<TelaCarregando />}><AdminLogin /></Suspense>} />
        <Route path="/admin/dashboard" element={<Suspense fallback={<TelaCarregando />}><Dashboard /></Suspense>} />
      </Routes>
    </>
  )
}
