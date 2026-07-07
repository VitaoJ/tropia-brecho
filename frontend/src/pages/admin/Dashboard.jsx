import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  listarEstoque, listarCategorias, criarProduto,
  atualizarProduto, excluirProduto, verificarSessao, formatarPreco,
} from '../../services/api'
import logoSimbolo from '../../assets/logo-simbolo.svg'

const CONDICOES = [
  { valor: 'otimo', label: 'Ótimo' },
  { valor: 'bom', label: 'Bom' },
  { valor: 'regular', label: 'Regular' },
]
const GENEROS = ['feminino', 'masculino', 'unissex']

const FORM_VAZIO = {
  name: '', price: '', category_id: '', size: '',
  gender: 'feminino', condition: 'otimo', description: '', imagens: '',
}

/* ─── Formulário de peça (modal) ─────────────────────────────── */
function FormPeca({ inicial, categorias, onSalvar, onFechar, salvando }) {
  const [form, setForm] = useState(inicial)
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSalvar({
      name: form.name,
      price: Number(form.price),
      category_id: form.category_id || null,
      size: form.size || null,
      gender: form.gender,
      condition: form.condition,
      description: form.description || null,
      images: form.imagens.split('\n').map(u => u.trim()).filter(Boolean),
    })
  }

  const input = 'h-10 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b] w-full'
  const rotulo = 'text-xs text-[#654a2b]'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onFechar}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-[#f2ead9] border border-[#d6c8b3] rounded-sm p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col gap-3">
        <h2 className="text-lg text-[#250000] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {inicial.name ? 'Editar peça' : 'Nova peça'}
        </h2>

        <label className="flex flex-col gap-1">
          <span className={rotulo}>Nome *</span>
          <input className={input} value={form.name} onChange={campo('name')} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Preço (R$) *</span>
            <input className={input} type="number" step="0.01" min="0" value={form.price} onChange={campo('price')} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Tamanho</span>
            <input className={input} value={form.size} onChange={campo('size')} placeholder="P, M, G, 38, 41..." />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Categoria</span>
            <select className={input} value={form.category_id} onChange={campo('category_id')}>
              <option value="">—</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Gênero</span>
            <select className={input} value={form.gender} onChange={campo('gender')}>
              {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Condição</span>
            <select className={input} value={form.condition} onChange={campo('condition')}>
              {CONDICOES.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={rotulo}>Descrição</span>
          <textarea className={`${input} h-24 py-2`} value={form.description} onChange={campo('description')} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={rotulo}>Fotos — uma URL por linha (upload em breve)</span>
          <textarea className={`${input} h-16 py-2`} value={form.imagens} onChange={campo('imagens')}
            placeholder="https://..." />
        </label>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onFechar}
            className="flex-1 h-10 border border-[#d6c8b3] text-[#654a2b] text-xs tracking-[0.14em] rounded-sm">
            CANCELAR
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 h-10 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm disabled:opacity-60">
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const [pecas, setPecas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)   // null | { inicial, id }
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const sair = useCallback(() => {
    logout()
    navigate('/admin')
  }, [logout, navigate])

  const carregar = useCallback(async () => {
    try {
      const [{ produtos }, { categorias: cats }] = await Promise.all([
        listarEstoque(token),
        listarCategorias(),
      ])
      setPecas(produtos)
      setCategorias(cats)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [token])

  // Guarda de rota: sem token → login; token inválido → login
  useEffect(() => {
    if (!token) { navigate('/admin'); return }
    verificarSessao(token).catch(sair)
    carregar()
  }, [token, navigate, sair, carregar])

  const salvar = async (dados) => {
    setSalvando(true)
    setErro(null)
    try {
      if (modal.id) await atualizarProduto(modal.id, dados, token)
      else await criarProduto(dados, token)
      setModal(null)
      await carregar()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const alternarVendida = async (p) => {
    try {
      await atualizarProduto(p.id, { sold: !p.sold }, token)
      setPecas(prev => prev.map(x => x.id === p.id ? { ...x, sold: !x.sold } : x))
    } catch (err) { setErro(err.message) }
  }

  const excluir = async (p) => {
    if (!confirm(`Excluir "${p.name}"? Essa ação não pode ser desfeita.`)) return
    try {
      await excluirProduto(p.id, token)
      setPecas(prev => prev.filter(x => x.id !== p.id))
    } catch (err) { setErro(err.message) }
  }

  const abrirEdicao = (p) => setModal({
    id: p.id,
    inicial: {
      name: p.name, price: p.price, category_id: p.category_id ?? '',
      size: p.size ?? '', gender: p.gender ?? 'feminino',
      condition: p.condition ?? 'otimo', description: p.description ?? '',
      imagens: (p.images ?? []).join('\n'),
    },
  })

  const disponiveis = pecas.filter(p => !p.sold).length

  return (
    <div className="min-h-screen bg-[#eae1d4] flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-none bg-[#250000] text-[#eae1d4] flex flex-col">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#432d1c]">
          <img src={logoSimbolo} alt="Tropia" className="h-8 w-8 object-contain invert" />
          <span className="text-sm tracking-[0.2em]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>TROPIA</span>
        </div>
        <nav className="flex flex-col py-4 text-xs tracking-[0.1em] flex-1">
          <span className="px-5 py-3 bg-[#432d1c] border-l-2 border-[#ffc509]">ESTOQUE</span>
          <span className="px-5 py-3 opacity-40 cursor-not-allowed">VISÃO GERAL — em breve</span>
          <span className="px-5 py-3 opacity-40 cursor-not-allowed">PEDIDOS — em breve</span>
          <span className="px-5 py-3 opacity-40 cursor-not-allowed">RELATÓRIOS — em breve</span>
        </nav>
        <button onClick={sair} className="px-5 py-4 text-left text-xs tracking-[0.1em] opacity-70 hover:opacity-100 border-t border-[#432d1c]">
          SAIR
        </button>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-8 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl text-[#250000]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Estoque</h1>
            <p className="text-xs text-[#654a2b] mt-0.5">
              {pecas.length} peças cadastradas · {disponiveis} disponíveis · {pecas.length - disponiveis} vendidas
            </p>
          </div>
          <button onClick={() => setModal({ id: null, inicial: FORM_VAZIO })}
            className="h-10 px-5 bg-[#ffc509] text-[#250000] text-xs tracking-[0.14em] font-medium rounded-sm">
            + NOVA PEÇA
          </button>
        </div>

        {erro && <p className="text-xs text-[#c44b00] bg-[#ffe0cc] px-3 py-2 rounded-sm mb-4">{erro}</p>}

        {carregando ? (
          <p className="text-xs text-[#654a2b] tracking-[0.2em] uppercase">Carregando...</p>
        ) : (
          <div className="border border-[#d6c8b3] rounded-sm overflow-hidden">
            <table className="w-full text-sm text-[#250000]">
              <thead>
                <tr className="bg-[#ddcfb9] text-left text-xs text-[#654a2b]">
                  <th className="px-4 py-3 font-medium">Peça</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Tam.</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Condição</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pecas.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-[#f2ead9]' : 'bg-[#eae1d4]'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-11 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif" }}>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#654a2b]">{p.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{p.size ?? '—'}</td>
                    <td className="px-4 py-3">{formatarPreco(p.price)}</td>
                    <td className="px-4 py-3 text-xs capitalize">{p.condition ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] tracking-[0.1em] px-2 py-1 rounded-full ${p.sold ? 'bg-[#d6c8b3] text-[#654a2b]' : 'bg-[#d8f3dc] text-[#2d6a4f]'}`}>
                        {p.sold ? 'VENDIDA' : 'DISPONÍVEL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end text-xs">
                        <button onClick={() => abrirEdicao(p)} className="px-2 py-1 border border-[#d6c8b3] rounded-sm hover:bg-[#ddcfb9]">
                          Editar
                        </button>
                        <button onClick={() => alternarVendida(p)} className="px-2 py-1 border border-[#d6c8b3] rounded-sm hover:bg-[#ddcfb9]">
                          {p.sold ? 'Repor' : 'Vender'}
                        </button>
                        <button onClick={() => excluir(p)} className="px-2 py-1 border border-[#c44b00] text-[#c44b00] rounded-sm hover:bg-[#ffe0cc]">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <FormPeca inicial={modal.inicial} categorias={categorias}
          onSalvar={salvar} onFechar={() => setModal(null)} salvando={salvando} />
      )}
    </div>
  )
}
