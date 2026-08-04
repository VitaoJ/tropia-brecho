import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  listarEstoque, listarCategorias, criarProduto,
  atualizarProduto, excluirProduto, verificarSessao,
  listarCupons, criarCupom, atualizarCupom, excluirCupom,
} from '../../services/api'
import { formatarPreco, calcularDesconto } from '../../utils/preco'
import logoSimbolo from '../../assets/logo-simbolo.svg'

const CONDICOES = [
  { valor: 'otimo', label: 'Ótimo' },
  { valor: 'bom', label: 'Bom' },
  { valor: 'regular', label: 'Regular' },
]
const GENEROS = ['feminino', 'masculino', 'unissex']

const FORM_VAZIO = {
  name: '', price: '', original_price: '', category_id: '', size: '',
  gender: 'feminino', condition: 'otimo', description: '', imagens: '',
}

const CAMPO = 'h-10 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b] w-full'
const ROTULO = 'text-xs text-[#654a2b]'

/* ─── Formulário de peça (modal) ─────────────────────────────── */
function FormPeca({ inicial, categorias, onSalvar, onFechar, salvando }) {
  const [form, setForm] = useState(inicial)
  const [percentual, setPercentual] = useState('')
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Atalho: joga o preço atual para "antes" e aplica o desconto sobre ele
  const aplicarPercentual = () => {
    const pct = Number(percentual)
    const base = Number(form.original_price) || Number(form.price)
    if (!base || !pct || pct < 1 || pct > 90) return
    setForm(f => ({
      ...f,
      original_price: base.toFixed(2),
      price: (base * (1 - pct / 100)).toFixed(2),
    }))
    setPercentual('')
  }

  const limparDesconto = () => setForm(f => ({ ...f, original_price: '' }))

  const desconto = calcularDesconto(form.price, form.original_price)
  const precoInvalido = form.original_price !== '' && !desconto

  const submit = (e) => {
    e.preventDefault()
    onSalvar({
      name: form.name,
      price: Number(form.price),
      original_price: form.original_price === '' ? null : Number(form.original_price),
      category_id: form.category_id || null,
      size: form.size || null,
      gender: form.gender,
      condition: form.condition,
      description: form.description || null,
      images: form.imagens.split('\n').map(u => u.trim()).filter(Boolean),
    })
  }

  const input = CAMPO
  const rotulo = ROTULO

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-4" onClick={onFechar}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-[#f2ead9] md:border border-[#d6c8b3] rounded-t-xl md:rounded-sm p-5 md:p-6 w-full max-w-lg max-h-[92vh] md:max-h-[90vh] overflow-y-auto flex flex-col gap-3">
        <div className="w-10 h-1 rounded-full bg-[#d6c8b3] mx-auto mb-2 md:hidden" />
        <h2 className="text-lg text-[#250000] mb-1">
          {inicial.name ? 'Editar peça' : 'Nova peça'}
        </h2>

        <label className="flex flex-col gap-1">
          <span className={rotulo}>Nome *</span>
          <input className={input} value={form.name} onChange={campo('name')} required />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Preço (R$) *</span>
            <input className={input} type="number" step="0.01" min="0" value={form.price} onChange={campo('price')} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Preço antes (R$)</span>
            <input className={input} type="number" step="0.01" min="0" value={form.original_price}
              onChange={campo('original_price')} placeholder="opcional" />
          </label>
          <label className="flex flex-col gap-1 col-span-2 md:col-span-1">
            <span className={rotulo}>Tamanho</span>
            <input className={input} value={form.size} onChange={campo('size')} placeholder="P, M, G, 38, 41..." />
          </label>
        </div>

        {/* Atalho de desconto */}
        <div className="bg-[#eae1d4] border border-[#d6c8b3] rounded-sm px-3 py-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#654a2b] flex-none">Aplicar desconto de</span>
            <input type="number" min="1" max="90" value={percentual} onChange={(e) => setPercentual(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarPercentual() } }}
              className="w-14 h-8 px-2 bg-[#f2ead9] border border-[#d6c8b3] rounded-sm text-sm text-center outline-none focus:border-[#654a2b]" />
            <span className="text-xs text-[#654a2b] flex-none">%</span>
            <button type="button" onClick={aplicarPercentual}
              className="h-8 px-3 bg-[#ffc509] text-[#250000] text-xs tracking-[0.1em] font-medium rounded-sm flex-none ml-auto">
              APLICAR
            </button>
          </div>
          <span className="text-xs">
            {precoInvalido
              ? <span className="text-[#c44b00]">O preço antes precisa ser maior que o atual</span>
              : desconto
                ? <span className="text-[#2d6a4f]">
                    −{desconto.percentual}% · de {formatarPreco(desconto.precoAntes)} por {formatarPreco(form.price)}
                    <button type="button" onClick={limparDesconto} className="ml-2 underline text-[#654a2b]">remover</button>
                  </span>
                : <span className="text-[#654a2b] opacity-60">sem desconto</span>}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <button type="submit" disabled={salvando || precoInvalido}
            className="flex-1 h-10 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm disabled:opacity-60">
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Cupons ─────────────────────────────────────────────────── */
const CUPOM_VAZIO = { code: '', discount_percent: '', valid_until: '', max_uses: '' }

function FormCupom({ onSalvar, onFechar, salvando }) {
  const [form, setForm] = useState(CUPOM_VAZIO)
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSalvar({
      code: form.code,
      discount_percent: Number(form.discount_percent),
      valid_until: form.valid_until || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-4" onClick={onFechar}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-[#f2ead9] md:border border-[#d6c8b3] rounded-t-xl md:rounded-sm p-5 md:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto flex flex-col gap-3">
        <div className="w-10 h-1 rounded-full bg-[#d6c8b3] mx-auto mb-2 md:hidden" />
        <h2 className="text-lg text-[#250000] mb-1">
          Novo cupom
        </h2>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Código *</span>
          <input className={`${CAMPO} uppercase`} value={form.code} onChange={campo('code')}
            placeholder="VERAO20" required />
        </label>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Desconto (%) *</span>
          <input className={CAMPO} type="number" min="1" max="90" value={form.discount_percent}
            onChange={campo('discount_percent')} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Válido até</span>
            <input className={CAMPO} type="date" value={form.valid_until} onChange={campo('valid_until')} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Limite de usos</span>
            <input className={CAMPO} type="number" min="1" value={form.max_uses}
              onChange={campo('max_uses')} placeholder="ilimitado" />
          </label>
        </div>
        <p className="text-[11px] text-[#654a2b] opacity-70 -mt-1">
          Em branco, o cupom vale para sempre e sem limite de usos.
        </p>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onFechar}
            className="flex-1 h-10 border border-[#d6c8b3] text-[#654a2b] text-xs tracking-[0.14em] rounded-sm">
            CANCELAR
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 h-10 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm disabled:opacity-60">
            {salvando ? 'SALVANDO...' : 'CRIAR CUPOM'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SecaoCupons({ token, onErro }) {
  const [cupons, setCupons] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const { cupons } = await listarCupons(token)
      setCupons(cupons)
    } catch (err) { onErro(err.message) } finally { setCarregando(false) }
  }, [token, onErro])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async (dados) => {
    setSalvando(true)
    try {
      await criarCupom(dados, token)
      setModal(false)
      await carregar()
    } catch (err) { onErro(err.message) } finally { setSalvando(false) }
  }

  const alternar = async (c) => {
    try {
      await atualizarCupom(c.id, { active: !c.active }, token)
      setCupons(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))
    } catch (err) { onErro(err.message) }
  }

  const remover = async (c) => {
    if (!confirm(`Excluir o cupom ${c.code}?`)) return
    try {
      const { mensagem } = await excluirCupom(c.id, token)
      if (mensagem.includes('desativado')) onErro(mensagem)
      await carregar()
    } catch (err) { onErro(err.message) }
  }

  const validade = (c) => {
    if (!c.valid_until) return 'sem prazo'
    const d = new Date(c.valid_until)
    const vencido = d < new Date().setHours(0, 0, 0, 0)
    return <span className={vencido ? 'text-[#c44b00]' : ''}>
      {d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{vencido && ' (vencido)'}
    </span>
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl text-[#250000]">Cupons</h1>
          <p className="text-xs text-[#654a2b] mt-0.5">
            {cupons.length} cadastrados · {cupons.filter(c => c.active).length} ativos
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="h-10 px-4 md:px-5 bg-[#ffc509] text-[#250000] text-xs tracking-[0.14em] font-medium rounded-sm flex-none">
          + NOVO
        </button>
      </div>

      {carregando ? (
        <p className="text-xs text-[#654a2b] tracking-[0.2em] uppercase">Carregando...</p>
      ) : cupons.length === 0 ? (
        <p className="text-sm text-[#654a2b]">Nenhum cupom criado ainda.</p>
      ) : (
        <>
        {/* Mobile: cartões, porque a tabela não cabe em 375px */}
        <div className="md:hidden flex flex-col gap-3">
          {cupons.map(c => (
            <div key={c.id} className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium tracking-[0.08em] text-[#250000]">{c.code}</p>
                  <p className="text-xs text-[#654a2b] mt-0.5">
                    {c.discount_percent}% · {c.uses}{c.max_uses != null ? ` de ${c.max_uses}` : ''} uso(s)
                  </p>
                </div>
                <span className={`text-[10px] tracking-[0.1em] px-2 py-1 rounded-full flex-none ${c.active ? 'bg-[#d8f3dc] text-[#2d6a4f]' : 'bg-[#d6c8b3] text-[#654a2b]'}`}>
                  {c.active ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
              <p className="text-xs text-[#654a2b] mb-3">Validade: {validade(c)}</p>
              <div className="flex gap-2 text-xs">
                <button onClick={() => alternar(c)}
                  className="flex-1 h-9 border border-[#d6c8b3] rounded-sm">
                  {c.active ? 'Desativar' : 'Ativar'}
                </button>
                <button onClick={() => remover(c)}
                  className="flex-1 h-9 border border-[#c44b00] text-[#c44b00] rounded-sm">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block border border-[#d6c8b3] rounded-sm overflow-hidden">
          <table className="w-full text-sm text-[#250000]">
            <thead>
              <tr className="bg-[#ddcfb9] text-left text-xs text-[#654a2b]">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Desconto</th>
                <th className="px-4 py-3 font-medium">Usos</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? 'bg-[#f2ead9]' : 'bg-[#eae1d4]'}>
                  <td className="px-4 py-3 font-medium tracking-[0.08em]">{c.code}</td>
                  <td className="px-4 py-3">{c.discount_percent}%</td>
                  <td className="px-4 py-3 text-xs">
                    {c.uses}{c.max_uses != null ? ` de ${c.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs">{validade(c)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] tracking-[0.1em] px-2 py-1 rounded-full ${c.active ? 'bg-[#d8f3dc] text-[#2d6a4f]' : 'bg-[#d6c8b3] text-[#654a2b]'}`}>
                      {c.active ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end text-xs">
                      <button onClick={() => alternar(c)} className="px-2 py-1 border border-[#d6c8b3] rounded-sm hover:bg-[#ddcfb9]">
                        {c.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => remover(c)} className="px-2 py-1 border border-[#c44b00] text-[#c44b00] rounded-sm hover:bg-[#ffe0cc]">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {modal && <FormCupom onSalvar={salvar} onFechar={() => setModal(false)} salvando={salvando} />}
    </>
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
  const [secao, setSecao] = useState('estoque')

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
      name: p.name, price: p.price, original_price: p.original_price ?? '',
      category_id: p.category_id ?? '', size: p.size ?? '',
      gender: p.gender ?? 'feminino', condition: p.condition ?? 'otimo',
      description: p.description ?? '', imagens: (p.images ?? []).join('\n'),
    },
  })

  const disponiveis = pecas.filter(p => !p.sold).length

  const SECOES = [['estoque', 'ESTOQUE'], ['cupons', 'CUPONS']]

  return (
    <div className="min-h-screen bg-[#eae1d4] md:flex">
      {/* Topo escuro no mobile; no desktop vira a coluna lateral */}
      <aside className="md:w-56 md:flex-none bg-[#250000] text-[#eae1d4] flex md:flex-col md:min-h-screen
        sticky top-0 z-40 items-center md:items-stretch justify-between md:justify-start px-4 md:px-0 h-14 md:h-auto">
        <div className="flex items-center gap-3 md:px-5 md:h-16 md:border-b border-[#432d1c]">
          <img src={logoSimbolo} alt="Tropia" className="h-7 w-7 md:h-8 md:w-8 object-contain invert" />
          <span className="text-sm tracking-[0.2em]">TROPIA</span>
        </div>

        {/* Seções: abas no mobile, lista no desktop */}
        <nav className="flex md:flex-col md:py-4 text-xs tracking-[0.1em] md:flex-1 gap-1 md:gap-0">
          {SECOES.map(([id, label]) => (
            <button key={id} onClick={() => setSecao(id)}
              className={`px-3 md:px-5 py-1.5 md:py-3 text-left rounded-sm md:rounded-none md:border-l-2 ${
                secao === id
                  ? 'bg-[#432d1c] md:border-[#ffc509]'
                  : 'md:border-transparent opacity-70 hover:opacity-100'
              }`}>
              {label}
            </button>
          ))}
          <span className="hidden md:block px-5 py-3 opacity-40 cursor-not-allowed">VISÃO GERAL — em breve</span>
          <span className="hidden md:block px-5 py-3 opacity-40 cursor-not-allowed">PEDIDOS — em breve</span>
          <span className="hidden md:block px-5 py-3 opacity-40 cursor-not-allowed">RELATÓRIOS — em breve</span>
        </nav>

        <button onClick={sair}
          className="text-xs tracking-[0.1em] opacity-70 hover:opacity-100 md:px-5 md:py-4 md:text-left md:border-t border-[#432d1c]">
          SAIR
        </button>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 p-4 md:p-8">
        {erro && <p className="text-xs text-[#c44b00] bg-[#ffe0cc] px-3 py-2 rounded-sm mb-4">{erro}</p>}

        {secao === 'cupons' ? <SecaoCupons token={token} onErro={setErro} /> : <>
        <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl text-[#250000]">Estoque</h1>
            <p className="text-xs text-[#654a2b] mt-0.5">
              {pecas.length} peças · {disponiveis} disponíveis · {pecas.length - disponiveis} vendidas
            </p>
          </div>
          <button onClick={() => setModal({ id: null, inicial: FORM_VAZIO })}
            className="h-10 px-4 md:px-5 bg-[#ffc509] text-[#250000] text-xs tracking-[0.14em] font-medium rounded-sm flex-none">
            + NOVA
          </button>
        </div>

        {carregando ? (
          <p className="text-xs text-[#654a2b] tracking-[0.2em] uppercase">Carregando...</p>
        ) : (
          <>
          {/* Mobile: cartões, porque a tabela tem 7 colunas e não cabe */}
          <div className="md:hidden flex flex-col gap-3">
            {pecas.map(p => {
              const d = calcularDesconto(p.price, p.original_price)
              return (
                <div key={p.id} className="border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-20 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[#250000] leading-tight">{p.name}</p>
                        <span className={`text-[9px] tracking-[0.1em] px-2 py-0.5 rounded-full flex-none ${p.sold ? 'bg-[#d6c8b3] text-[#654a2b]' : 'bg-[#d8f3dc] text-[#2d6a4f]'}`}>
                          {p.sold ? 'VENDIDA' : 'DISPONÍVEL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#654a2b] mt-1 capitalize">
                        {[p.categoria, p.size && `Tam. ${p.size}`, p.condition].filter(Boolean).join(' · ')}
                      </p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        {d && <span className="line-through text-[#654a2b] text-xs">{formatarPreco(d.precoAntes)}</span>}
                        <span className="text-[#250000] font-medium">{formatarPreco(p.price)}</span>
                        {d && (
                          <span className="text-[9px] bg-[#ffc509] text-[#250000] px-1.5 py-0.5 rounded-sm font-medium">
                            −{d.percentual}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs mt-3">
                    <button onClick={() => abrirEdicao(p)} className="flex-1 h-9 border border-[#d6c8b3] rounded-sm">
                      Editar
                    </button>
                    <button onClick={() => alternarVendida(p)} className="flex-1 h-9 border border-[#d6c8b3] rounded-sm">
                      {p.sold ? 'Repor' : 'Vender'}
                    </button>
                    <button onClick={() => excluir(p)} className="flex-1 h-9 border border-[#c44b00] text-[#c44b00] rounded-sm">
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block border border-[#d6c8b3] rounded-sm overflow-x-auto">
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
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#654a2b]">{p.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{p.size ?? '—'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const d = calcularDesconto(p.price, p.original_price)
                        return d ? (
                          <span className="flex items-center gap-1.5">
                            <span className="line-through text-[#654a2b] text-xs">{formatarPreco(d.precoAntes)}</span>
                            {formatarPreco(p.price)}
                            <span className="text-[9px] bg-[#ffc509] text-[#250000] px-1.5 py-0.5 rounded-sm font-medium">
                              −{d.percentual}%
                            </span>
                          </span>
                        ) : formatarPreco(p.price)
                      })()}
                    </td>
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
          </>
        )}
        </>}
      </main>

      {modal && (
        <FormPeca inicial={modal.inicial} categorias={categorias}
          onSalvar={salvar} onFechar={() => setModal(null)} salvando={salvando} />
      )}
    </div>
  )
}
