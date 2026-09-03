import { useState, useEffect, useCallback } from 'react'
import {
  listarAvaliacoesAdmin, criarAvaliacao, atualizarAvaliacao,
  excluirAvaliacao, listarEstoque,
} from '../../services/api'
import { otimizar } from '../../utils/imagem'
import GerenciadorFotos from './GerenciadorFotos'

const CAMPO = 'h-10 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b] w-full'
const ROTULO = 'text-xs text-[#654a2b]'

const VAZIO = { author: '', handle: '', text: '', rating: '5', foto: [], product_id: '' }

function Form({ inicial, pecas, onSalvar, onFechar, salvando, token }) {
  const [form, setForm] = useState(inicial)
  const campo = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSalvar({
      author: form.author,
      handle: form.handle,
      text: form.text,
      rating: form.rating === '' ? null : Number(form.rating),
      photo: form.foto[0] ?? null,
      product_id: form.product_id || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center md:p-4" onClick={onFechar}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-[#f2ead9] md:border border-[#d6c8b3] rounded-t-xl md:rounded-sm p-5 md:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col gap-3">
        <div className="w-10 h-1 rounded-full bg-[#d6c8b3] mx-auto mb-2 md:hidden" />
        <h2 className="text-lg text-[#250000] mb-1">
          {inicial.author ? 'Editar avaliação' : 'Nova avaliação'}
        </h2>

        <p className="text-[11px] text-[#654a2b] bg-[#eae1d4] border border-[#d6c8b3] rounded-sm px-3 py-2 leading-relaxed">
          Use só mensagens que clientes de verdade mandaram. Depoimento inventado
          é propaganda enganosa, e num brechó a confiança é o que sustenta a venda.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Nome *</span>
            <input className={CAMPO} value={form.author} onChange={campo('author')} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Instagram</span>
            <input className={CAMPO} value={form.handle} onChange={campo('handle')} placeholder="@fulana" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={ROTULO}>O que a pessoa escreveu *</span>
          <textarea className={`${CAMPO} h-28 py-2`} value={form.text} onChange={campo('text')}
            maxLength={600} required />
          <span className="text-[11px] text-[#654a2b] opacity-70 self-end">
            {form.text.length}/600
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Nota</span>
            <select className={CAMPO} value={form.rating} onChange={campo('rating')}>
              <option value="">sem nota</option>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROTULO}>Peça comprada</span>
            <select className={CAMPO} value={form.product_id} onChange={campo('product_id')}>
              <option value="">—</option>
              {pecas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>

        {/* Uma foto só: a pessoa com a peça. Reaproveita o mesmo uploader das
            peças, então ganha recorte de fundo e compressão de graça. */}
        <GerenciadorFotos token={token} fotos={form.foto.slice(0, 1)}
          aoMudar={(atualizar) => setForm(f => ({ ...f, foto: atualizar(f.foto).slice(-1) }))} />

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

export default function SecaoAvaliacoes({ token, onErro }) {
  const [avaliacoes, setAvaliacoes] = useState([])
  const [pecas, setPecas] = useState([])
  const [modal, setModal] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const { avaliacoes } = await listarAvaliacoesAdmin(token)
      setAvaliacoes(avaliacoes)
    } catch (e) { onErro(e.message) }
  }, [token, onErro])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    listarEstoque(token).then(({ produtos }) => setPecas(produtos)).catch(() => {})
  }, [token])

  async function salvar(dados) {
    setSalvando(true)
    try {
      if (modal.id) await atualizarAvaliacao(modal.id, dados, token)
      else await criarAvaliacao(dados, token)
      setModal(null)
      await carregar()
    } catch (e) { onErro(e.message) }
    finally { setSalvando(false) }
  }

  async function alternar(a) {
    try {
      await atualizarAvaliacao(a.id, { published: !a.publicada }, token)
      await carregar()
    } catch (e) { onErro(e.message) }
  }

  async function remover(a) {
    if (!confirm(`Apagar a avaliação de ${a.autor}?`)) return
    try { await excluirAvaliacao(a.id, token); await carregar() }
    catch (e) { onErro(e.message) }
  }

  const publicadas = avaliacoes.filter(a => a.publicada).length

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl text-[#250000]">Avaliações</h1>
          <p className="text-xs text-[#654a2b] mt-0.5">
            {avaliacoes.length} no total · {publicadas} na home
          </p>
        </div>
        <button onClick={() => setModal({ id: null, inicial: VAZIO })}
          className="h-10 px-4 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm flex-none">
          + NOVA
        </button>
      </div>

      {avaliacoes.length === 0 ? (
        <p className="text-sm text-[#654a2b] bg-[#f2ead9] border border-[#d6c8b3] rounded-sm px-4 py-6 leading-relaxed">
          Nenhuma avaliação ainda. Enquanto não houver nenhuma publicada, a seção
          não aparece na página inicial — melhor não ter do que ter vazia.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {avaliacoes.map(a => (
            <li key={a.id}
              className={`border border-[#d6c8b3] rounded-sm bg-[#f2ead9] p-3 flex gap-3
                ${a.publicada ? '' : 'opacity-60'}`}>
              <div className="w-16 h-20 rounded-sm bg-[#d6c8b3] flex-none overflow-hidden">
                {a.foto && <img src={otimizar(a.foto, 160)} alt="" className="w-full h-full object-cover" />}
              </div>

              <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-[#250000] text-sm truncate">{a.autor}</span>
                  {a.handle && <span className="text-[11px] text-[#654a2b] truncate">@{a.handle}</span>}
                  {a.nota && <span className="text-[11px] text-[#654a2b] flex-none">{a.nota}/5</span>}
                </div>
                <p className="text-[13px] text-[#654a2b] mt-1 line-clamp-2">{a.texto}</p>
                {a.peca && (
                  <p className="text-[11px] text-[#654a2b] mt-1 opacity-70 truncate">
                    levou: {a.peca.nome}
                  </p>
                )}

                <div className="flex gap-3 mt-auto pt-2 text-xs">
                  <button onClick={() => setModal({
                    id: a.id,
                    inicial: {
                      author: a.autor, handle: a.handle ?? '', text: a.texto,
                      rating: a.nota ? String(a.nota) : '',
                      foto: a.foto ? [a.foto] : [],
                      product_id: a.peca?.id ?? '',
                    },
                  })} className="text-[#654a2b] underline underline-offset-2">Editar</button>
                  <button onClick={() => alternar(a)} className="text-[#654a2b] underline underline-offset-2">
                    {a.publicada ? 'Tirar da home' : 'Publicar'}
                  </button>
                  <button onClick={() => remover(a)} className="text-[#c44b00] underline underline-offset-2">
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <Form inicial={modal.inicial} pecas={pecas} token={token}
          onSalvar={salvar} onFechar={() => setModal(null)} salvando={salvando} />
      )}
    </>
  )
}
