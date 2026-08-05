import { useState, useRef, useEffect } from 'react'
import { subirFoto, configUpload } from '../../services/api'
import { prepararFoto, otimizar } from '../../utils/imagem'

/**
 * Fotos da peça: subir, reordenar e remover.
 *
 * A ordem é o que o site usa — a primeira foto é a capa que aparece no
 * catálogo. Por isso ela leva um selo, em vez de a regra ficar só na cabeça
 * de quem cadastra.
 *
 * Reordena com setas e não arrastando: o painel é usado no celular, onde
 * arrastar disputa com o rolar da página e erra na mão de qualquer um.
 */
export default function GerenciadorFotos({ fotos, aoMudar, token }) {
  const [enviando, setEnviando] = useState([])   // { id, nome, progresso, erro }
  const [configurado, setConfigurado] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [colando, setColando] = useState(false)
  const [urlColada, setUrlColada] = useState('')
  const entrada = useRef(null)

  useEffect(() => {
    configUpload(token)
      .then(c => setConfigurado(c.configurado))
      .catch(() => setConfigurado(false))
  }, [token])

  async function receber(arquivos) {
    const lista = [...arquivos].filter(a => a.type.startsWith('image/'))
    if (!lista.length) return

    const pendentes = lista.map((a, i) => ({
      id: `${Date.now()}-${i}`, nome: a.name, progresso: 0, erro: null,
    }))
    setEnviando(p => [...p, ...pendentes])

    // Uma de cada vez: o 4G da loja engasga com quatro uploads simultâneos, e
    // em fila a ordem das fotos sai igual à que a pessoa escolheu.
    for (let i = 0; i < lista.length; i++) {
      const { id } = pendentes[i]
      const mexer = (mudanca) =>
        setEnviando(p => p.map(e => e.id === id ? { ...e, ...mudanca } : e))

      try {
        const pronta = await prepararFoto(lista[i])
        const { url } = await subirFoto(pronta, token, pct => mexer({ progresso: pct }))
        aoMudar(atual => [...atual, url])
        setEnviando(p => p.filter(e => e.id !== id))
      } catch (err) {
        mexer({ erro: err.message })
      }
    }
  }

  const mover = (de, para) => {
    if (para < 0 || para >= fotos.length) return
    const copia = [...fotos]
    const [f] = copia.splice(de, 1)
    copia.splice(para, 0, f)
    aoMudar(() => copia)
  }

  // Tira só a referência. A foto continua no Cloudinary de propósito: quem
  // remove por engano e fecha sem salvar não perde nada.
  const remover = (i) => aoMudar(atual => atual.filter((_, idx) => idx !== i))

  const adicionarUrl = () => {
    const url = urlColada.trim()
    if (!url) return
    aoMudar(atual => [...atual, url])
    setUrlColada('')
    setColando(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-[#654a2b]">
          Fotos {fotos.length > 0 && <span className="opacity-70">— a primeira é a capa</span>}
        </span>
        {fotos.length > 0 && (
          <span className="text-[11px] text-[#654a2b] opacity-70">{fotos.length} foto{fotos.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Grade */}
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((url, i) => (
            <li key={`${url}-${i}`}
              className="relative aspect-[3/4] rounded-sm overflow-hidden bg-[#eae1d4] border border-[#d6c8b3] group">
              <img src={otimizar(url, 300)} alt="" className="w-full h-full object-cover" />

              {i === 0 && (
                <span className="absolute top-1 left-1 bg-[#ffc509] text-[#250000] text-[9px] tracking-[0.1em] px-1.5 py-0.5 rounded-sm font-medium">
                  CAPA
                </span>
              )}

              <button type="button" onClick={() => remover(i)} aria-label={`Remover foto ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#250000]/75 text-[#eae1d4]
                  text-sm leading-none flex items-center justify-center hover:bg-[#c44b00]">
                ×
              </button>

              <div className="absolute bottom-0 inset-x-0 flex">
                <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0}
                  aria-label={`Mover foto ${i + 1} para trás`}
                  className="flex-1 py-1 bg-[#250000]/75 text-[#eae1d4] text-xs disabled:opacity-25 hover:bg-[#250000]">
                  ‹
                </button>
                <button type="button" onClick={() => mover(i, i + 1)} disabled={i === fotos.length - 1}
                  aria-label={`Mover foto ${i + 1} para frente`}
                  className="flex-1 py-1 bg-[#250000]/75 text-[#eae1d4] text-xs disabled:opacity-25 hover:bg-[#250000]">
                  ›
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Em andamento */}
      {enviando.map(e => (
        <div key={e.id} className="flex items-center gap-2 text-[11px]">
          <span className="truncate flex-1 text-[#654a2b]">{e.nome}</span>
          {e.erro ? (
            <>
              <span className="text-[#c44b00] flex-none">{e.erro}</span>
              <button type="button" onClick={() => setEnviando(p => p.filter(x => x.id !== e.id))}
                className="text-[#654a2b] underline flex-none">ok</button>
            </>
          ) : (
            <>
              <span className="w-24 h-1 bg-[#d6c8b3] rounded-full overflow-hidden flex-none">
                <span className="block h-full bg-[#ffc509] transition-all" style={{ width: `${e.progresso}%` }} />
              </span>
              <span className="tabular-nums text-[#654a2b] flex-none w-8 text-right">{e.progresso}%</span>
            </>
          )}
        </div>
      ))}

      {/* Área de soltar */}
      {configurado === false ? (
        <p className="text-[11px] text-[#c44b00] bg-[#fdf1e3] border border-[#c44b00] rounded-sm px-3 py-2 leading-relaxed">
          Upload não configurado no servidor. Defina CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no Railway. Por enquanto dá
          para colar a URL da foto.
        </p>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); receber(e.dataTransfer.files) }}
          onClick={() => entrada.current?.click()}
          className={`border border-dashed rounded-sm px-3 py-4 text-center cursor-pointer transition-colors
            ${arrastando ? 'border-[#654a2b] bg-[#eae1d4]' : 'border-[#d6c8b3] hover:border-[#654a2b]'}`}
        >
          <p className="text-xs text-[#250000]">
            {fotos.length ? 'Adicionar mais fotos' : 'Escolher fotos da peça'}
          </p>
          <p className="text-[11px] text-[#654a2b] mt-0.5">
            toque para escolher, ou arraste para cá
          </p>
          <input ref={entrada} type="file" accept="image/*" multiple hidden
            onChange={(e) => { receber(e.target.files); e.target.value = '' }} />
        </div>
      )}

      {/* Colar URL — as peças antigas foram cadastradas assim */}
      {colando ? (
        <div className="flex gap-2">
          <input value={urlColada} onChange={(e) => setUrlColada(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarUrl() } }}
            placeholder="https://..." autoFocus
            className="flex-1 h-9 px-2 bg-[#eae1d4] border border-[#d6c8b3] rounded-sm text-xs outline-none focus:border-[#654a2b]" />
          <button type="button" onClick={adicionarUrl}
            className="h-9 px-3 bg-[#250000] text-[#eae1d4] text-[11px] tracking-[0.1em] rounded-sm flex-none">
            ADICIONAR
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setColando(true)}
          className="self-start text-[11px] text-[#654a2b] underline underline-offset-2 hover:text-[#250000]">
          colar URL de uma foto
        </button>
      )}
    </div>
  )
}
