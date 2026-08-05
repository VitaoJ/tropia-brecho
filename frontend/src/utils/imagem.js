// Preparo e entrega de imagens.

const MAX_LADO = 2000       // suficiente para zoom na peça, longe dos 12 MP do celular
const QUALIDADE = 0.85

/**
 * Encolhe a foto antes de subir.
 *
 * Foto de celular tem 4–8 MB. Subir isso pelo 4G da loja demora e às vezes
 * falha no meio; reduzida fica em ~300 KB e sobe na hora. A qualidade que
 * chega no site é a mesma, porque ninguém exibe 4000px de largura.
 *
 * `imageOrientation: 'from-image'` não é detalhe: sem isso, foto tirada em pé
 * no celular sobe deitada, porque a rotação vive só no EXIF e se perde ao
 * redesenhar no canvas.
 */
export async function prepararFoto(arquivo) {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error(`"${arquivo.name}" não é uma imagem`)
  }

  const bitmap = await criarBitmap(arquivo)
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))

  // Já é pequena: sobe o original e não perde nada recomprimindo
  if (escala === 1 && arquivo.size < 1_000_000) {
    bitmap.close?.()
    return arquivo
  }

  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close?.()

  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', QUALIDADE))

  if (!blob) throw new Error('Não foi possível preparar a imagem')

  // Sobe como JPEG de propósito: o webp fica por conta do f_auto na entrega,
  // que escolhe o melhor formato para cada navegador sem perder o original.
  return new File([blob], trocarExtensao(arquivo.name), { type: 'image/jpeg' })
}

async function criarBitmap(arquivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    } catch { /* navegador antigo: cai no <img> abaixo */ }
  }

  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    await new Promise((ok, falhou) => {
      img.onload = ok
      img.onerror = () => falhou(new Error('Não foi possível ler a imagem'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

const trocarExtensao = (nome) => nome.replace(/\.[^.]+$/, '') + '.jpg'

/* ─── Entrega ────────────────────────────────────────────────── */

/**
 * Pede ao Cloudinary a versão certa para o espaço onde a imagem vai aparecer.
 *
 *   f_auto  → webp ou avif conforme o navegador
 *   q_auto  → compressão até onde o olho não percebe
 *   c_limit → só reduz, nunca aumenta nem corta
 *
 * URL que não é do Cloudinary passa intacta, então as fotos antigas coladas à
 * mão continuam funcionando.
 */
export function otimizar(url, largura = 800) {
  if (typeof url !== 'string' || !url.includes('/image/upload/')) return url
  if (url.includes('f_auto')) return url   // já otimizada, não empilha
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${largura}/`)
}

/** Identificador da foto no Cloudinary, para poder apagá-la de lá. */
export function publicIdDaUrl(url) {
  if (typeof url !== 'string' || !url.includes('/image/upload/')) return null
  const depois = url.split('/image/upload/')[1] ?? ''
  // Tira transformações (a=1,b=2/) e a versão (v123456/) da frente
  const semPrefixos = depois
    .split('/')
    .filter(parte => !/^v\d+$/.test(parte) && !/^[a-z]{1,3}_[^/]*$/.test(parte))
    .join('/')
  return semPrefixos.replace(/\.[^./]+$/, '') || null
}
