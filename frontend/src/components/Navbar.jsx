import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { listarCategorias } from '../services/api'
import logoSimbolo from '../assets/logo-simbolo.svg'
import logoTexto from '../assets/logo-texto.svg'

const LINKS = [
  { label: 'Início', path: '/' },
  { label: 'Catálogo', path: '/catalogo', categorias: true },
  { label: 'Favoritos', path: '/favoritos' },
  { label: 'Upcycling e Customização', path: '/upcycling' },
  { label: 'Quem somos', path: '/quem-somos' },
  { label: 'Contato', path: '/contato' },
]

// Só a linha de apoio de cada categoria. O nome e o slug vêm do banco — se
// uma categoria nova entrar pelo painel, ela aparece no menu sem passar por
// aqui, e no máximo fica sem a nota.
const NOTAS = {
  feminino: 'Vestidos, blusas, alfaiataria',
  masculino: 'Camisas, jaquetas, calças',
  calcados: 'Tênis, botas, sandálias',
  acessorios: 'Bolsas, cintos, chapéus',
}

/**
 * As categorias do acervo, lidas uma vez por carregamento.
 *
 * Falha em silêncio de propósito: sem elas o menu perde a lista, mas o link
 * do catálogo continua de pé, e é melhor que travar a navegação inteira
 * porque a API piscou.
 */
function useCategorias() {
  const [categorias, setCategorias] = useState([])
  useEffect(() => {
    let vivo = true
    listarCategorias()
      .then(r => { if (vivo) setCategorias(r.categorias ?? []) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  return categorias
}

/* ─── Busca ──────────────────────────────────────────────────────
   Leva para o catálogo com ?busca=. Não é campo decorativo: o
   servidor filtra por nome e descrição de verdade.               */
function Busca({ aoEnviar, className = '' }) {
  const [params] = useSearchParams()
  const [termo, setTermo] = useState(params.get('busca') ?? '')
  const navigate = useNavigate()

  // Voltar/avançar do navegador precisa refletir no campo
  useEffect(() => { setTermo(params.get('busca') ?? '') }, [params])

  const enviar = (e) => {
    e.preventDefault()
    const q = termo.trim()
    navigate(q ? `/catalogo?busca=${encodeURIComponent(q)}` : '/catalogo')
    aoEnviar?.()
  }

  return (
    <form onSubmit={enviar} role="search"
      className={`flex items-center gap-2 border-b border-[#250000]/40 focus-within:border-[#250000] transition-colors ${className}`}>
      <img src={logoSimbolo} alt="" className="h-4 w-4 object-contain opacity-70 flex-none" />
      <input
        value={termo} onChange={(e) => setTermo(e.target.value)}
        type="search" placeholder="Buscar" aria-label="Buscar peças"
        className="w-full bg-transparent text-sm text-[#250000] py-1.5 outline-none
          placeholder:text-[#654a2b]/70 [&::-webkit-search-cancel-button]:appearance-none" />
    </form>
  )
}

function Icones({ quantidade }) {
  return (
    <div className="flex items-center gap-4 flex-none">
      <Link to="/favoritos" aria-label="Favoritos" className="hidden md:block hover:opacity-70 transition-opacity">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      </Link>
      <Link to="/carrinho" aria-label="Carrinho" className="relative hover:opacity-70 transition-opacity">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        {quantidade > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#ffc509] text-[#250000] text-[9px] font-medium">
            {quantidade}
          </span>
        )}
      </Link>
    </div>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const { quantidade } = useCart()
  const [menu, setMenu] = useState(false)
  const [abertas, setAbertas] = useState(false)   // categorias no painel do celular
  const categorias = useCategorias()

  // Trocar de página fecha o menu; sem isso ele fica aberto por cima do destino.
  // As categorias fecham junto para o menu não reabrir já desdobrado.
  useEffect(() => { setMenu(false); setAbertas(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menu])

  const linkClasse = (path) =>
    `uppercase transition-colors ${pathname === path ? 'text-[#250000]' : 'text-[#654a2b] hover:text-[#250000]'}`

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#eae1d4] border-b border-[#d6c8b3]">
        {/* ── Celular: menu, marca e carrinho. A busca e os links moram no
             painel, porque seis links não cabem numa barra de 375px. ── */}
        <div className="md:hidden h-14 px-4 flex items-center justify-between gap-3">
          <button onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu}
            className="p-1 -ml-1 flex-none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#250000" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2" aria-label="Tropia, início">
            <img src={logoTexto} alt="Tropia" className="h-9 object-contain" />
          </Link>

          <Icones quantidade={quantidade} />
        </div>

        {/* ── Desktop: marca centralizada em cima; busca, links e ícones embaixo ── */}
        <div className="hidden md:block max-w-6xl mx-auto px-8 pt-3 pb-2.5">
          <Link to="/" className="block w-fit mx-auto" aria-label="Tropia, início">
            <img src={logoTexto} alt="Tropia" className="h-12 object-contain" />
          </Link>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 mt-1">
            <Busca className="w-full max-w-[230px]" />

            <div className="flex items-center gap-5 lg:gap-7 text-[11px] tracking-[0.14em] whitespace-nowrap">
              {LINKS.map(l => (
                l.categorias && categorias.length > 0 ? (
                  /* O painel abre no hover e também no foco do teclado, e
                     encosta na barra (sem vão) para o mouse não perdê-lo no
                     caminho. O link continua clicável e leva ao acervo. */
                  <div key={l.path} className="relative group">
                    <Link to={l.path} className={`${linkClasse(l.path)} inline-flex items-center gap-1.5`}>
                      {l.label}
                      <span aria-hidden="true"
                        className="text-[8px] transition-transform duration-300 group-hover:rotate-180">▾</span>
                    </Link>

                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50
                      invisible opacity-0 translate-y-1
                      group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
                      group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0
                      transition-all duration-200 ease-out">
                      <ul className="min-w-[230px] bg-[#eae1d4] border border-[#d6c8b3] shadow-lg shadow-[#250000]/10 py-1.5">
                        {categorias.map(c => (
                          <li key={c.slug}>
                            <Link to={`/catalogo?categoria=${c.slug}`}
                              className="block px-4 py-2.5 hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
                              <span className="block text-[12px] tracking-[0.1em] text-inherit">{c.name}</span>
                              {NOTAS[c.slug] && (
                                <span className="block text-[10px] tracking-normal normal-case opacity-60 mt-0.5">
                                  {NOTAS[c.slug]}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Link key={l.path} to={l.path} className={linkClasse(l.path)}>{l.label}</Link>
                )
              ))}
            </div>

            <div className="justify-self-end">
              <Icones quantidade={quantidade} />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Painel do celular ── */}
      {menu && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#250000]/40" onClick={() => setMenu(false)}>
          <div className="bg-[#eae1d4] px-4 pt-4 pb-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <img src={logoTexto} alt="Tropia" className="h-9 object-contain" />
              <button onClick={() => setMenu(false)} aria-label="Fechar menu"
                className="w-9 h-9 -mr-2 flex items-center justify-center text-2xl leading-none text-[#250000]">
                ×
              </button>
            </div>

            <Busca aoEnviar={() => setMenu(false)} />

            <ul className="flex flex-col">
              {LINKS.map(l => (
                <li key={l.path} className="border-b border-[#d6c8b3]">
                  {/* No toque não existe "passar o mouse por cima": o rótulo
                      leva ao catálogo e a seta, num alvo próprio, abre as
                      categorias sem tirar a pessoa da página. */}
                  <div className="flex items-center">
                    <Link to={l.path} className={`flex-1 block py-3 text-sm ${linkClasse(l.path)}`}>
                      {l.label}
                    </Link>

                    {l.categorias && categorias.length > 0 && (
                      <button type="button" onClick={() => setAbertas(a => !a)}
                        aria-expanded={abertas} aria-label={abertas ? 'Fechar categorias' : 'Abrir categorias'}
                        className="flex-none w-11 h-11 -mr-2 flex items-center justify-center text-[#654a2b]">
                        <span aria-hidden="true"
                          className={`text-[10px] transition-transform duration-300 ${abertas ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                    )}
                  </div>

                  {l.categorias && abertas && categorias.length > 0 && (
                    <ul className="pb-2 -mt-0.5">
                      {categorias.map(c => (
                        <li key={c.slug}>
                          <Link to={`/catalogo?categoria=${c.slug}`}
                            className="block py-2.5 pl-4 text-sm text-[#654a2b] hover:text-[#250000]
                              border-l border-[#d6c8b3]">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
