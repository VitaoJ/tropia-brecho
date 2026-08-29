import { Router } from 'express'
import { createHash } from 'crypto'
import { requireAdmin } from '../middlewares/auth.js'

const router = Router()

const PASTA = 'tropia/pecas'

const config = () => ({
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  chave: process.env.CLOUDINARY_API_KEY,
  segredo: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Assinatura do Cloudinary: os parâmetros em ordem alfabética, no formato
 * `a=1&b=2`, com o segredo colado no fim, tudo em SHA-1.
 *
 * O segredo nunca sai daqui — o navegador recebe só a assinatura pronta, que
 * vale para um upload e expira. Por isso não usamos "preset não assinado":
 * aquele ficaria visível no código do site e qualquer um poderia mandar
 * arquivo para a conta.
 */
function assinar(params, segredo) {
  const texto = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(texto + segredo).digest('hex')
}

// GET /api/upload/config — o painel pergunta se dá para subir foto antes de
// mostrar o botão, em vez de deixar a pessoa tentar e falhar.
router.get('/config', requireAdmin, (_req, res) => {
  const { cloud, chave, segredo } = config()
  res.json({ configurado: Boolean(cloud && chave && segredo), cloud_name: cloud ?? null })
})

// POST /api/upload/assinatura — libera um upload direto do navegador
router.post('/assinatura', requireAdmin, (_req, res) => {
  const { cloud, chave, segredo } = config()

  if (!cloud || !chave || !segredo) {
    const faltando = [
      !cloud && 'CLOUDINARY_CLOUD_NAME',
      !chave && 'CLOUDINARY_API_KEY',
      !segredo && 'CLOUDINARY_API_SECRET',
    ].filter(Boolean)
    return res.status(503).json({
      erro: `Upload não configurado. Falta definir: ${faltando.join(', ')}`,
    })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder: PASTA, timestamp }

  res.json({
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    campos: { ...params, api_key: chave, signature: assinar(params, segredo) },
  })
})

// POST /api/upload/remover — apaga do Cloudinary de vez.
//
// Não é chamado ao tirar a foto do formulário: ali só some a referência, e a
// pessoa pode desistir e fechar sem salvar. Só apaga quando alguém pede de
// propósito, para não destruir arquivo por engano.
router.post('/remover', requireAdmin, async (req, res) => {
  const { cloud, chave, segredo } = config()
  const publicId = String(req.body.public_id ?? '').trim()

  if (!cloud || !chave || !segredo) {
    return res.status(503).json({ erro: 'Upload não configurado' })
  }
  if (!publicId) return res.status(400).json({ erro: 'Informe o public_id' })
  // A pasta é a única coisa que este painel pode mexer: sem isto, um id
  // qualquer apagaria qualquer imagem da conta.
  if (!publicId.startsWith(`${PASTA}/`)) {
    return res.status(400).json({ erro: 'Só dá para remover fotos das peças' })
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const corpo = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: chave,
      signature: assinar({ public_id: publicId, timestamp }, segredo),
    })

    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
      method: 'POST', body: corpo,
    })
    const dados = await r.json()

    if (dados.result !== 'ok' && dados.result !== 'not found') {
      return res.status(502).json({ erro: `Cloudinary respondeu: ${dados.result ?? 'erro'}` })
    }
    res.json({ removida: dados.result === 'ok' })
  } catch (err) {
    console.error('POST /upload/remover:', err)
    res.status(500).json({ erro: 'Erro ao remover a foto' })
  }
})

// Cor de fundo do site. O recorte troca o fundo por ela, então as fotos
// deixam de ser retângulos brancos colados sobre o bege.
const FUNDO_DO_SITE = 'eae1d4'

// POST /api/upload/recortar — tira o fundo da foto e devolve uma foto nova.
//
// Roda a IA UMA VEZ e guarda o resultado como um arquivo próprio, em vez de
// deixar o recorte na URL de entrega: lá, cada largura do srcset dispararia um
// recorte novo, multiplicando o custo por foto. Aqui é uma vez e pronto.
//
// A foto original continua na conta, intacta — dá para voltar atrás.
router.post('/recortar', requireAdmin, async (req, res) => {
  const { cloud, chave, segredo } = config()
  const publicId = String(req.body.public_id ?? '').trim()

  if (!cloud || !chave || !segredo) return res.status(503).json({ erro: 'Upload não configurado' })
  if (!publicId) return res.status(400).json({ erro: 'Informe o public_id' })
  if (!publicId.startsWith(`${PASTA}/`)) {
    return res.status(400).json({ erro: 'Só dá para recortar fotos das peças' })
  }

  try {
    // A origem é a própria foto já transformada: o Cloudinary busca essa URL,
    // aplica o recorte e salva o resultado como um arquivo novo.
    const origem = `https://res.cloudinary.com/${cloud}/image/upload`
      + `/e_background_removal,b_rgb:${FUNDO_DO_SITE}/${publicId}`

    const timestamp = Math.floor(Date.now() / 1000)
    const params = { folder: PASTA, timestamp }
    const corpo = new URLSearchParams({
      file: origem,
      ...params,
      api_key: chave,
      signature: assinar(params, segredo),
    })

    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST', body: corpo,
    })
    const dados = await r.json()

    if (!dados.secure_url) {
      // Recorte é add-on: quando a cota acaba, o Cloudinary recusa aqui.
      return res.status(502).json({
        erro: dados.error?.message ?? 'O Cloudinary não conseguiu recortar esta foto',
      })
    }
    res.json({ url: dados.secure_url, publicId: dados.public_id })
  } catch (err) {
    console.error('POST /upload/recortar:', err)
    res.status(500).json({ erro: 'Erro ao recortar a foto' })
  }
})

export default router
