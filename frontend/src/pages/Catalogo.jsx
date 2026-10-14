import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarProdutos, listarCategorias, listarFiltros } from '../services/api'
import { normalizarProduto } from '../utils/preco'
import ProductCard from '../components/ProductCard'

const CONTAINER = 'max-w-6xl mx-auto px-4 md:px-8'
const POR_PAGINA = 12

const CONDICOES = [
  { valor: 'otimo', label: 'Ótimo' },
  { valor: 'bom', label: 'Bom' },
  { valor: 'regular', label: 'Regular' },
]

// Tamanhos fixos, na ordem de vestir. Eles vinham do estoque em ordem
// alfabética (40, G, GG, M, P) e mudavam a cada peça cadastrada. Tamanho sem
// peça continua clicável e cai no "Nenhuma peça encontrada".
const LETRAS = ['PP', 'P', 'M', 'G', 'GG']
// Numeração de calça, short e calçado.
const NUMEROS = Array.from({ length: 10 }, (_, i) => String(35 + i))

// Os filtros vivem na URL para que voltar, recarregar e compartilhar
// mantenham a mesma seleção.
// `tag` e `colecao` chegam por link (a tag na página da peça, o "ver tudo"
// de uma coleção na home) e não pelo painel de filtros.
const CHAVES = ['categoria', 'tamanho', 'genero', 'condicao', 'busca', 'tag', 'colecao']

function Chip({ ativo, children, ...props }) {
  return (
    <button {...props}
      className={`flex-none text-xs tracking-[0.1em] px-4 py-2 rounded-full border transition-colors ${
        ativo
          ? 'bg-[#250000] text-[#eae1d4] border-[#250000]'
          : 'border-[#d6c8b3] text-[#654a2b] hover:border-[#654a2b]'
      }`}>
      {children}
    </button>
  )
}

function GrupoFiltro({ titulo, opcoes, selecionado, aoSelecionar }) {
  if (opcoes.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-[11px] tracking-[0.18em] text-[#654a2b] uppercase mb-2.5">{titulo}</h3>
      <div className="flex flex-wrap gap-2">
        {opcoes.map(o => (
          <Chip key={o.valor} ativo={selecionado === o.valor}
            onClick={() => aoSelecionar(selecionado === o.valor ? null : o.valor)}>
            <span className="capitalize">{o.label}</span>
          </Chip>
        ))}
      </div>
    </div>
  )
}

/* Letras sempre à vista; numeração recolhida, porque são dez opções e a
   maior parte do acervo é P–GG. Abre sozinha se o tamanho escolhido for um
   número, senão a seleção ficaria escondida. */
function GrupoTamanho({ selecionado, aoSelecionar }) {
  const numeroAtivo = NUMEROS.includes(selecionado)
  const [aberto, setAberto] = useState(numeroAtivo)
  useEffect(() => { if (numeroAtivo) setAberto(true) }, [numeroAtivo])

  const chip = (t) => (
    <Chip key={t} ativo={selecionado === t}
      onClick={() => aoSelecionar(selecionado === t ? null : t)}>
      {t}
    </Chip>
  )

  return (
    <div className="mb-6">
      <h3 className="text-[11px] tracking-[0.18em] text-[#654a2b] uppercase mb-2.5">Tamanho</h3>
      <div className="flex flex-wrap gap-2">{LETRAS.map(chip)}</div>

      <button type="button" onClick={() => setAberto(v => !v)} aria-expanded={aberto}
        className="mt-2 w-full min-h-11 flex items-center justify-between
          text-[11px] tracking-[0.18em] text-[#654a2b] uppercase hover:text-[#250000]">
        <span>Numeração{numeroAtivo && !aberto ? ` · ${selecionado}` : ''}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          className={`transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {aberto && <div className="flex flex-wrap gap-2 pt-1">{NUMEROS.map(chip)}</div>}
    </div>
  )
}

function PainelFiltros({ categorias, generos, filtros, definir, limpar, qtdAtivos }) {
  return (
    <>
      <GrupoFiltro titulo="Categoria" selecionado={filtros.categoria}
        aoSelecionar={v => definir('categoria', v)}
        opcoes={categorias.map(c => ({ valor: c.slug, label: c.name }))} />

      <GrupoTamanho selecionado={filtros.tamanho} aoSelecionar={v => definir('tamanho', v)} />

      <GrupoFiltro titulo="Gênero" selecionado={filtros.genero}
        aoSelecionar={v => definir('genero', v)}
        opcoes={generos.map(g => ({ valor: g, label: g }))} />

      <GrupoFiltro titulo="Condição" selecionado={filtros.condicao}
        aoSelecionar={v => definir('condicao', v)}
        opcoes={CONDICOES} />

      {qtdAtivos > 0 && (
        <button onClick={limpar}
          className="text-xs text-[#654a2b] underline underline-offset-4 hover:text-[#250000]">
          Limpar filtros
        </button>
      )}
    </>
  )
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams()
  const [pecas, setPecas] = useState([])
  const [pagina, setPagina] = useState(1)
  const [temMais, setTemMais] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [generos, setGeneros] = useState([])
  const [painelAberto, setPainelAberto] = useState(false)
  const [infoColecao, setInfoColecao] = useState(null)   // { nome, chamada }

  const filtros = Object.fromEntries(CHAVES.map(k => [k, params.get(k)]))
  const qtdAtivos = CHAVES.filter(k => filtros[k]).length
  const assinatura = CHAVES.map(k => filtros[k] ?? '').join('|')

  const definir = (chave, valor) => {
    const novo = new URLSearchParams(params)
    valor ? novo.set(chave, valor) : novo.delete(chave)
    setParams(novo, { replace: true })
  }
  const limpar = () => setParams(new URLSearchParams(), { replace: true })

  useEffect(() => {
    listarCategorias().then(r => setCategorias(r.categorias)).catch(() => {})
    listarFiltros().then(r => setGeneros(r.generos ?? [])).catch(() => {})
  }, [])

  const buscar = useCallback(async (pag) => {
    setCarregando(true)
    setErro(null)
    try {
      const atuais = Object.fromEntries(CHAVES.map((k, i) => [k, assinatura.split('|')[i] || undefined]))
      const { produtos, colecao } = await listarProdutos({ ...atuais, limite: POR_PAGINA, pagina: pag })
      setInfoColecao(colecao ?? null)
      const novos = produtos.map(normalizarProduto)
      setPecas(prev => pag === 1 ? novos : [...prev, ...novos])
      setTemMais(produtos.length === POR_PAGINA)
    } catch (err) {
      setErro('Não foi possível carregar as peças. Tente de novo em instantes.')
      console.warn('Catálogo:', err.message)
    } finally {
      setCarregando(false)
    }
  }, [assinatura])

  // Trocar de filtro sempre recomeça da primeira página
  useEffect(() => {
    setPagina(1)
    buscar(1)
  }, [buscar])

  const carregarMais = useCallback(() => {
    setPagina(p => {
      const proxima = p + 1
      buscar(proxima)
      return proxima
    })
  }, [buscar])

  // Carrega sozinho quando o fim da lista entra na tela
  const sentinela = useRef(null)
  useEffect(() => {
    if (!temMais || carregando || !sentinela.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) carregarMais() },
      { rootMargin: '400px' }
    )
    obs.observe(sentinela.current)
    return () => obs.disconnect()
  }, [temMais, carregando, carregarMais])

  const nomeCategoria = categorias.find(c => c.slug === filtros.categoria)?.name

  return (
    <section className={`${CONTAINER} pt-6 md:pt-12 pb-12 md:pb-20`}>
      <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-medium text-[#250000]">
            {(filtros.colecao && infoColecao?.nome) || nomeCategoria || 'Catálogo'}
          </h1>
          {filtros.colecao && infoColecao?.chamada && (
            <p className="text-[13px] md:text-sm text-[#654a2b] mt-1">{infoColecao.chamada}</p>
          )}
        </div>
        {!carregando && pecas.length > 0 && (
          <span className="text-xs text-[#654a2b] flex-none">
            {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'}
          </span>
        )}
      </div>

      {/* Coleção e tag não estão no painel de filtros: aparecem aqui, com
          um X, para a pessoa saber por que está vendo só parte do acervo. */}
      {(filtros.colecao || filtros.tag) && (
        <div className="flex flex-wrap gap-2 -mt-1 mb-4 md:mb-6">
          {[['colecao', 'Coleção', infoColecao?.nome ?? filtros.colecao], ['tag', 'Tag', filtros.tag]]
            .filter(([chave]) => filtros[chave])
            .map(([chave, rotulo, valor]) => (
              <button key={chave} onClick={() => definir(chave, null)}
                aria-label={`Tirar o filtro ${rotulo.toLowerCase()} ${valor}`}
                className="inline-flex items-center gap-2 min-h-9 pl-3.5 pr-3 rounded-full bg-[#250000]
                  text-[#eae1d4] text-xs tracking-[0.06em]">
                <span><span className="opacity-60">{rotulo}:</span> {valor}</span>
                <span aria-hidden="true" className="text-base leading-none">×</span>
              </button>
            ))}
        </div>
      )}

      <div className="md:flex md:gap-10 lg:gap-14 md:items-start">
        {/* Desktop: filtros na coluna lateral */}
        <aside className="hidden md:block w-56 flex-none md:sticky md:top-24">
          <PainelFiltros {...{ categorias, generos, filtros, definir, limpar, qtdAtivos }} />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile: atalho de categorias + botão de filtros */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-4 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}>
            <Chip onClick={() => setPainelAberto(true)} ativo={qtdAtivos > 0}>
              Filtros{qtdAtivos > 0 && ` (${qtdAtivos})`}
            </Chip>
            <span className="flex-none w-px bg-[#d6c8b3] my-1" />
            {categorias.map(c => (
              <Chip key={c.slug} ativo={filtros.categoria === c.slug}
                onClick={() => definir('categoria', filtros.categoria === c.slug ? null : c.slug)}>
                {c.name}
              </Chip>
            ))}
          </div>

          {erro && (
            <p className="text-xs text-[#c44b00] bg-[#ffe0cc] px-3 py-2 rounded-sm mb-4">{erro}</p>
          )}

          {pecas.length === 0 && !carregando ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-4 text-center">
              <p className="text-sm text-[#654a2b]">
                {qtdAtivos > 0
                  ? 'Nenhuma peça encontrada com esses filtros.'
                  : 'Nenhuma peça disponível no momento.'}
              </p>
              {qtdAtivos > 0 && (
                <button onClick={limpar}
                  className="text-xs tracking-[0.14em] border border-[#250000] px-5 py-2.5 text-[#250000] hover:bg-[#250000] hover:text-[#eae1d4] transition-colors">
                  LIMPAR FILTROS
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                {pecas.map(p => <ProductCard key={p.id} produto={p} />)}
              </div>

              <div ref={sentinela} className="h-10 flex items-center justify-center mt-6">
                {carregando && (
                  <span className="text-xs tracking-[0.2em] text-[#654a2b] uppercase">Carregando...</span>
                )}
                {!carregando && temMais && (
                  <button onClick={carregarMais}
                    className="text-xs tracking-[0.14em] border border-[#d6c8b3] px-6 py-2.5 text-[#654a2b] hover:border-[#654a2b] transition-colors">
                    CARREGAR MAIS
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile: painel de filtros deslizando de baixo */}
      {painelAberto && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end" onClick={() => setPainelAberto(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()}
            className="relative w-full bg-[#eae1d4] rounded-t-xl px-4 pt-3 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#d6c8b3] mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-[#250000]">Filtros</h2>
              <button onClick={() => setPainelAberto(false)}
                className="text-xs tracking-[0.14em] text-[#654a2b]">FECHAR</button>
            </div>
            <PainelFiltros {...{ categorias, generos, filtros, definir, limpar, qtdAtivos }} />
            <button onClick={() => setPainelAberto(false)}
              className="w-full h-12 mt-2 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.16em] rounded-sm">
              VER RESULTADOS
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
