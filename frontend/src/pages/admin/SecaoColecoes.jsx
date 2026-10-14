import { useState, useEffect, useCallback } from 'react'
import ConfirmarAcao from '@/components/admin/ConfirmarAcao'
import {
  listarColecoes, criarColecao, atualizarColecao, levarParaCapa,
  arquivarColecao, excluirColecao, salvarOrdemHome, listarEstoque,
} from '../../services/api'
import { otimizar } from '../../utils/imagem'
import { formatarPreco } from '../../utils/preco'
import GerenciadorFotos from './GerenciadorFotos'
import BlocoInstagram from './BlocoInstagram'

const CAMPO = 'h-10 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b] w-full'
const ROTULO = 'text-xs text-[#654a2b]'
const LINK = 'text-[#654a2b] underline underline-offset-2'

// Seções que a home monta sozinha. As coleções entram pelo nome.
const NOME_FIXA = {
  ultimas: 'Últimas chegadas',
  avaliacoes: 'Avaliações',
  instagram: 'Instagram',
}

const VAZIA = { nome: '', chamada: '', foto: [], peca_destaque_id: '', pecas: [] }

/* ─── Formulário da coleção ──────────────────────────────────── */
function Form({ inicial, estoque, onSalvar, onFechar, salvando, token }) {
  const [form, setForm] = useState(inicial)
  const [busca, setBusca] = useState('')
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const marcada = (id) => form.pecas.includes(id)
  const alternar = (id) => setForm(f => ({
    ...f,
    pecas: marcada(id) ? f.pecas.filter(x => x !== id) : [...f.pecas, id],
    // Tirar da coleção a peça do cartão deixa o cartão no automático.
    peca_destaque_id: marcada(id) && f.peca_destaque_id === id ? '' : f.peca_destaque_id,
  }))

  const termo = busca.trim().toLowerCase()
  // As que já estavam na coleção ao abrir vêm primeiro, vendidas por último.
  // A ordem segue o que estava marcado AO ABRIR, e não o de agora: senão
  // cada peça marcada pulava para o topo e a lista andava debaixo do dedo.
  const [jaEstavam] = useState(() => new Set(inicial.pecas))
  const lista = estoque
    .filter(p => !termo || p.name.toLowerCase().includes(termo))
    .sort((a, b) => (jaEstavam.has(b.id) - jaEstavam.has(a.id)) || (a.sold - b.sold))

  const escolhidas = estoque.filter(p => marcada(p.id) && !p.sold && p.images?.length)

  const submit = (e) => {
    e.preventDefault()
    onSalvar({
      nome: form.nome,
      chamada: form.chamada,
      foto_capa: form.foto[0] ?? null,
      peca_destaque_id: form.peca_destaque_id || null,
      pecas: form.pecas,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-4" onClick={onFechar}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-[#f2ead9] md:border border-[#d6c8b3] rounded-t-xl md:rounded-sm p-5 md:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col gap-3">
        <div className="w-10 h-1 rounded-full bg-[#d6c8b3] mx-auto mb-2 md:hidden" />
        <h2 className="text-lg text-[#250000] mb-1">
          {inicial.nome ? 'Editar coleção' : 'Nova coleção'}
        </h2>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Nome *</span>
          <input className={CAMPO} value={form.nome} onChange={campo('nome')}
            maxLength={60} placeholder="vintage" required />
          <span className="text-[11px] text-[#654a2b] opacity-70">
            Na capa, é o texto grande. Na home, o título da faixa.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Chamada</span>
          <input className={CAMPO} value={form.chamada} onChange={campo('chamada')}
            maxLength={140} placeholder="Alfaiataria, malha e jeans garimpados" />
        </label>

        {/* Uma foto só. Reaproveita o uploader das peças: compressão e recorte
            de graça, e a foto mais recente substitui a anterior. */}
        <div className="flex flex-col gap-1">
          <GerenciadorFotos token={token} fotos={form.foto.slice(0, 1)}
            titulo="Foto de fundo da capa" chamada="Escolher a foto da capa"
            aoMudar={(atualizar) => setForm(f => ({ ...f, foto: atualizar(f.foto).slice(-1) }))} />
          <span className="text-[11px] text-[#654a2b] opacity-70">
            Só precisa se a coleção for para a capa. Use foto deitada, com a peça vestida.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className={ROTULO}>Peças da coleção</span>
            <span className="text-[11px] text-[#654a2b]">{form.pecas.length} escolhida(s)</span>
          </div>
          <input className={CAMPO} value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome" type="search" />
          <ul className="border border-[#d6c8b3] rounded-sm bg-[#eae1d4] max-h-72 overflow-y-auto divide-y divide-[#d6c8b3]">
            {lista.map(p => (
              <li key={p.id}>
                <label className={`flex items-center gap-3 px-3 min-h-14 py-2 cursor-pointer ${p.sold ? 'opacity-50' : ''}`}>
                  <input type="checkbox" checked={marcada(p.id)} onChange={() => alternar(p.id)}
                    className="w-5 h-5 flex-none accent-[#250000]" />
                  <span className="w-10 h-10 flex-none rounded-sm bg-[#f2ead9] overflow-hidden">
                    {p.images?.[0] && <img src={otimizar(p.images[0], 80)} alt="" className="w-full h-full object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[#250000] truncate">{p.name}</span>
                    <span className="block text-[11px] text-[#654a2b]">
                      {[p.size && `Tam. ${p.size}`, formatarPreco(p.price), p.sold && 'vendida'].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
            {lista.length === 0 && (
              <li className="px-3 py-4 text-xs text-[#654a2b]">Nenhuma peça com esse nome.</li>
            )}
          </ul>
          <span className="text-[11px] text-[#654a2b] opacity-70">
            Peça vendida pode ficar marcada: ela some da home sozinha e volta se for desmarcada como vendida.
          </span>
        </div>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Peça em destaque no cartão da capa</span>
          <select className={CAMPO} value={form.peca_destaque_id} onChange={campo('peca_destaque_id')}>
            <option value="">Automática: a mais nova da coleção</option>
            {escolhidas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-[11px] text-[#654a2b] opacity-70">
            Se a peça escolhida for vendida, o cartão troca sozinho pela mais nova disponível.
          </span>
        </label>

        <div className="flex gap-3 mt-2 sticky bottom-0 bg-[#f2ead9] pt-2">
          <button type="button" onClick={onFechar}
            className="flex-1 h-11 border border-[#d6c8b3] text-[#654a2b] text-xs tracking-[0.14em] rounded-sm">
            CANCELAR
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 h-11 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm disabled:opacity-60">
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Ordem da página inicial ────────────────────────────────── */
function OrdemHome({ secoes, colecoes, capa, aoMudar }) {
  const nome = (s) => s.tipo === 'colecao'
    ? colecoes.find(c => c.id === s.collection_id)?.nome ?? '—'
    : NOME_FIXA[s.tipo]

  const mover = (i, passo) => {
    const j = i + passo
    if (j < 0 || j >= secoes.length) return
    const nova = [...secoes]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    aoMudar(nova)
  }
  const alternar = (i) => aoMudar(secoes.map((s, k) => k === i ? { ...s, visivel: !s.visivel } : s))

  return (
    <section className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] mb-6 md:mb-8">
      <div className="px-4 py-3 border-b border-[#d6c8b3]">
        <h2 className="text-sm text-[#250000]">Página inicial, de cima para baixo</h2>
        <p className="text-[11px] text-[#654a2b] mt-0.5">
          As setas mudam a ordem e salvam na hora. Coleção sem peça disponível não aparece no site.
        </p>
      </div>

      <ol>
        <li className="flex flex-col justify-center px-4 min-h-14 py-2 border-b border-[#d6c8b3] bg-[#eae1d4]">
          <span className="text-sm text-[#250000] truncate">{capa?.nome ?? 'nenhuma'}</span>
          <span className="text-[10px] tracking-[0.16em] text-[#654a2b]">CAPA · sempre a primeira</span>
        </li>
        {secoes.map((s, i) => {
          const arquivada = s.tipo === 'colecao' && colecoes.find(c => c.id === s.collection_id)?.arquivada
          if (arquivada) return null
          return (
            <li key={s.id} className={`flex items-center gap-1 pl-4 pr-1 min-h-14 py-1 border-b last:border-b-0 border-[#d6c8b3] ${s.visivel ? '' : 'opacity-50'}`}>
              {/* Nome em cima, tipo embaixo: numa coluna só sobra largura
                  para o nome inteiro no celular. */}
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm text-[#250000] truncate">{nome(s)}</span>
                <span className="text-[10px] tracking-[0.16em] text-[#654a2b]">
                  {s.tipo === 'colecao' ? 'COLEÇÃO' : s.tipo === 'instagram' ? 'POSTS ABAIXO' : 'AUTOMÁTICA'}
                  {s.visivel ? '' : ' · ESCONDIDA'}
                </span>
              </span>
              <button onClick={() => alternar(i)}
                className="h-11 px-2 text-[11px] text-[#654a2b] underline underline-offset-2 flex-none">
                {s.visivel ? 'esconder' : 'mostrar'}
              </button>
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${nome(s)}`}
                className="w-11 h-11 flex items-center justify-center text-[#250000] disabled:opacity-25 flex-none">↑</button>
              <button onClick={() => mover(i, 1)} disabled={i === secoes.length - 1} aria-label={`Descer ${nome(s)}`}
                className="w-11 h-11 flex items-center justify-center text-[#250000] disabled:opacity-25 flex-none">↓</button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* ─── Seção ──────────────────────────────────────────────────── */
export default function SecaoColecoes({ token, onErro }) {
  const [colecoes, setColecoes] = useState([])
  const [secoes, setSecoes] = useState([])
  const [estoque, setEstoque] = useState([])
  const [modal, setModal] = useState(null)        // { id, inicial }
  const [salvando, setSalvando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [verArquivadas, setVerArquivadas] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await listarColecoes(token)
      setColecoes(r.colecoes)
      setSecoes(r.secoes)
    } catch (e) { onErro(e.message) }
  }, [token, onErro])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    listarEstoque(token).then(({ produtos }) => setEstoque(produtos)).catch(() => {})
  }, [token])

  // Ordem salva na hora, sem botão: no celular é um toque por mudança. Se o
  // servidor recusar, volta a lista de antes para a tela não mentir.
  async function mudarOrdem(nova) {
    const antes = secoes
    setSecoes(nova)
    try { await salvarOrdemHome(nova.map(s => ({ id: s.id, visivel: s.visivel })), token) }
    catch (e) { setSecoes(antes); onErro(e.message) }
  }

  async function salvar(dados) {
    setSalvando(true)
    try {
      if (modal.id) await atualizarColecao(modal.id, dados, token)
      else await criarColecao(dados, token)
      setModal(null)
      await carregar()
    } catch (e) { onErro(e.message) }
    finally { setSalvando(false) }
  }

  const acao = (fn) => async (c) => {
    try { await fn(c); await carregar() }
    catch (e) { onErro(e.message) }
  }
  const paraCapa = acao(c => levarParaCapa(c.id, token))
  const arquivar = acao(c => arquivarColecao(c.id, !c.arquivada, token))
  const excluir = acao(async (c) => { setParaExcluir(null); await excluirColecao(c.id, token) })

  const capa = colecoes.find(c => c.na_capa)
  const ativas = colecoes.filter(c => !c.arquivada)
  const arquivadas = colecoes.filter(c => c.arquivada)
  const disponiveis = (c) => estoque.filter(p => c.pecas.includes(p.id) && !p.sold).length

  const editar = (c) => setModal({
    id: c.id,
    inicial: {
      nome: c.nome, chamada: c.chamada ?? '', foto: c.foto_capa ? [c.foto_capa] : [],
      peca_destaque_id: c.peca_destaque_id ?? '', pecas: c.pecas,
    },
  })

  // Função e não componente: declarado aqui dentro, um componente seria um
  // tipo novo a cada render e o React remontaria a lista inteira.
  const cartao = (c) => {
    const qtd = disponiveis(c)
    const miniatura = c.foto_capa
      ?? estoque.find(p => p.id === c.peca_destaque_id)?.images?.[0]
      ?? estoque.find(p => c.pecas.includes(p.id) && p.images?.length)?.images?.[0]
    return (
      <li key={c.id} className={`border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-3 flex gap-3 ${c.arquivada ? 'opacity-60' : ''}`}>
        <div className="w-16 h-20 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
          {miniatura && <img src={otimizar(miniatura, 160)} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#250000] text-sm font-medium truncate">{c.nome}</span>
            {c.na_capa && (
              <span className="text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#ffc509] text-[#250000]">NA CAPA</span>
            )}
            {c.arquivada && (
              <span className="text-[9px] tracking-[0.12em] px-2 py-0.5 rounded-full bg-[#d6c8b3] text-[#654a2b]">ARQUIVADA</span>
            )}
          </div>
          <p className="text-[11px] text-[#654a2b] mt-0.5">
            {qtd} {qtd === 1 ? 'peça disponível' : 'peças disponíveis'}
            {qtd === 0 && !c.arquivada && ' · não aparece na home'}
          </p>
          {c.chamada && <p className="text-[12px] text-[#654a2b] mt-1 line-clamp-1">{c.chamada}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-2 text-xs">
            <button onClick={() => editar(c)} className={LINK}>Editar</button>
            {!c.na_capa && !c.arquivada && (
              <button onClick={() => paraCapa(c)} className={LINK}
                title={c.foto_capa ? '' : 'Precisa de foto de fundo'}>
                Levar para a capa
              </button>
            )}
            {!c.na_capa && (
              <button onClick={() => arquivar(c)} className={LINK}>
                {c.arquivada ? 'Desarquivar' : 'Arquivar'}
              </button>
            )}
            {!c.na_capa && (
              <button onClick={() => setParaExcluir(c)} className="text-[#c44b00] underline underline-offset-2">
                Excluir
              </button>
            )}
          </div>
        </div>
      </li>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl text-[#250000]">Coleções</h1>
          <p className="text-xs text-[#654a2b] mt-0.5">
            {ativas.length} ativa(s){capa ? ` · na capa: ${capa.nome}` : ''}
          </p>
        </div>
        <button onClick={() => setModal({ id: null, inicial: VAZIA })}
          className="h-10 px-4 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm flex-none">
          + NOVA
        </button>
      </div>

      <OrdemHome secoes={secoes} colecoes={colecoes} capa={capa} aoMudar={mudarOrdem} />

      <ul className="flex flex-col gap-3">
        {ativas.map(cartao)}
      </ul>

      {arquivadas.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setVerArquivadas(v => !v)} aria-expanded={verArquivadas}
            className="min-h-11 text-xs tracking-[0.14em] text-[#654a2b] uppercase">
            {verArquivadas ? '− ' : '+ '}Arquivadas ({arquivadas.length})
          </button>
          {verArquivadas && (
            <ul className="flex flex-col gap-3 mt-2">
              {arquivadas.map(cartao)}
            </ul>
          )}
        </div>
      )}

      <BlocoInstagram token={token} onErro={onErro} />

      {modal && (
        <Form inicial={modal.inicial} estoque={estoque} token={token}
          onSalvar={salvar} onFechar={() => setModal(null)} salvando={salvando} />
      )}

      <ConfirmarAcao
        aberto={!!paraExcluir} destrutivo
        titulo={`Excluir a coleção ${paraExcluir?.nome ?? ''}?`}
        descricao="A coleção some do site e do painel. As peças continuam no estoque. Para só tirar do ar, use Arquivar."
        rotuloConfirmar="Excluir coleção"
        aoConfirmar={() => excluir(paraExcluir)}
        aoFechar={() => setParaExcluir(null)}
      />
    </>
  )
}
