import Navbar from './Navbar'
import BottomNav from './BottomNav'
import Rodape from './Rodape'

// Espaçamentos compensam a navbar fixa no topo e, no mobile, a barra inferior.
//
// O respiro da barra inferior fica no fim da página, depois do rodapé. Ele
// estava no <main>, antes do rodapé: abria um vão bege entre o conteúdo e o
// rodapé, e o fim do rodapé ficava escondido atrás da barra.
//
// `rodapeColado` tira a margem de cima do rodapé, para a página que termina
// numa faixa que deve encostar nele (a home).
export default function Layout({ children, rodapeColado = false }) {
  return (
    <div className="min-h-screen bg-[#eae1d4] pb-[60px] md:pb-0">
      {/* A barra de frete grátis mora dentro da Navbar, logo abaixo dela, para
          acompanhar a rolagem junto do cabeçalho. */}
      <Navbar />
      <main>
        {children}
      </main>
      <Rodape colado={rodapeColado} />
      <BottomNav />
    </div>
  )
}
