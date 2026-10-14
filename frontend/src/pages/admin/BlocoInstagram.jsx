import { useState, useEffect, useCallback } from 'react'
import ConfirmarAcao from '@/components/admin/ConfirmarAcao'
import {
  listarInstagram, criarPostInstagram, atualizarPostInstagram,
  excluirPostInstagram, ordenarInstagram,
} from '../../services/api'
import { otimizar } from '../../utils/imagem'
import GerenciadorFotos from './GerenciadorFotos'

const CAMPO = 'h-11 px-3 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-sm text-[#250000] outline-none focus:border-[#654a2b] w-full'

// "https://www.instagram.com/p/DdWbbYfEale/" → "p/DdWbbYfEale"
const curto = (url) => url.replace(/^https:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')

/**
 * Posts do Instagram que aparecem no fim da home.
 *
 * Cada post é um link + uma imagem subida aqui. A imagem é nossa, e não
 * puxada do Instagram, porque o link de imagem de lá expira em dias e a
 * faixa quebraria sozinha. Post sem imagem fica guardado e não aparece.
 */
export default function BlocoInstagram({ token, onErro }) {
  const [posts, setPosts] = useState([])
  const [link, setLink] = useState('')
  const [abertoId, setAbertoId] = useState(null)   // post com o uploader aberto
  const [paraTirar, setParaTirar] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    try { setPosts((await listarInstagram(token)).posts) }
    catch (e) { onErro(e.message) }
  }, [token, onErro])

  useEffect(() => { carregar() }, [carregar])

  async function adicionar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const { post } = await criarPostInstagram({ url: link }, token)
      setLink('')
      await carregar()
      setAbertoId(post.id)   // o próximo passo óbvio é pôr a imagem
    } catch (err) { onErro(err.message) }
    finally { setEnviando(false) }
  }

  // O uploader devolve uma função da lista anterior; o post tem uma imagem só.
  async function trocarImagem(post, atualizar) {
    const lista = atualizar(post.imagem ? [post.imagem] : [])
    const imagem = lista[lista.length - 1] ?? null
    try {
      await atualizarPostInstagram(post.id, { imagem }, token)
      if (imagem) setAbertoId(null)
      await carregar()
    } catch (err) { onErro(err.message) }
  }

  async function mover(i, passo) {
    const j = i + passo
    if (j < 0 || j >= posts.length) return
    const nova = [...posts]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    const antes = posts
    setPosts(nova)
    try { await ordenarInstagram(nova.map(p => p.id), token) }
    catch (err) { setPosts(antes); onErro(err.message) }
  }

  async function tirar(post) {
    setParaTirar(null)
    try { await excluirPostInstagram(post.id, token); await carregar() }
    catch (err) { onErro(err.message) }
  }

  const semImagem = posts.filter(p => !p.imagem).length

  return (
    <section id="instagram" className="mt-8 border border-[#d6c8b3] rounded-sm bg-[#f2ead9]">
      <div className="px-4 py-3 border-b border-[#d6c8b3]">
        <h2 className="text-sm text-[#250000]">Instagram no fim da home</h2>
        <p className="text-[11px] text-[#654a2b] mt-0.5 leading-relaxed">
          {posts.length} de 6 posts
          {semImagem > 0 && ` · ${semImagem} sem imagem, que ainda não aparecem no site`}.
          Use a imagem original do post, salva no celular. Link de imagem do Instagram não serve: ele expira.
        </p>
      </div>

      <ol>
        {posts.map((p, i) => (
          <li key={p.id} className="border-b border-[#d6c8b3]">
            <div className="flex items-center gap-3 pl-4 pr-1 py-2">
              <div className="w-12 flex-none rounded-sm bg-[#d6c8b3] overflow-hidden flex items-center justify-center"
                style={{ height: '3.75rem' }}>
                {p.imagem
                  ? <img src={otimizar(p.imagem, 120)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[9px] text-[#654a2b] text-center leading-tight px-1">sem imagem</span>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <a href={p.url} target="_blank" rel="noreferrer noopener"
                  className="text-sm text-[#250000] truncate underline underline-offset-2 decoration-[#d6c8b3]">
                  {curto(p.url)}
                </a>
                <div className="flex gap-4 text-xs mt-1">
                  <button onClick={() => setAbertoId(abertoId === p.id ? null : p.id)}
                    className="text-[#654a2b] underline underline-offset-2 min-h-8">
                    {abertoId === p.id ? 'Fechar' : p.imagem ? 'Trocar imagem' : 'Pôr imagem'}
                  </button>
                  <button onClick={() => setParaTirar(p)}
                    className="text-[#c44b00] underline underline-offset-2 min-h-8">
                    Tirar
                  </button>
                </div>
              </div>
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir o post ${i + 1}`}
                className="w-11 h-11 flex items-center justify-center text-[#250000] disabled:opacity-25 flex-none">↑</button>
              <button onClick={() => mover(i, 1)} disabled={i === posts.length - 1} aria-label={`Descer o post ${i + 1}`}
                className="w-11 h-11 flex items-center justify-center text-[#250000] disabled:opacity-25 flex-none">↓</button>
            </div>

            {abertoId === p.id && (
              <div className="px-4 pb-4">
                <GerenciadorFotos token={token} fotos={p.imagem ? [p.imagem] : []}
                  titulo="Imagem do post" chamada="Escolher a imagem do post"
                  aoMudar={(atualizar) => trocarImagem(p, atualizar)} />
              </div>
            )}
          </li>
        ))}
      </ol>

      {posts.length < 6 && (
        <form onSubmit={adicionar} className="p-4 flex flex-col sm:flex-row gap-2">
          <input className={CAMPO} value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="Cole o link do post (instagram.com/p/…)" inputMode="url" required />
          <button type="submit" disabled={enviando}
            className="h-11 px-5 bg-[#250000] text-[#eae1d4] text-xs tracking-[0.14em] rounded-sm flex-none disabled:opacity-60">
            {enviando ? 'ADICIONANDO...' : 'ADICIONAR'}
          </button>
        </form>
      )}

      <ConfirmarAcao
        aberto={!!paraTirar}
        titulo="Tirar este post da home?"
        descricao="Ele some da faixa do site. O post continua no Instagram."
        rotuloConfirmar="Tirar da home"
        aoConfirmar={() => tirar(paraTirar)}
        aoFechar={() => setParaTirar(null)}
      />
    </section>
  )
}
