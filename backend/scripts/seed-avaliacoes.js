// Avaliações de exemplo, para ver o carrossel antes de existirem as reais.
//
//   npm run seed:avaliacoes             insere as 5
//   npm run seed:avaliacoes -- --remover  tira todas de volta
//
// ⚠️ ISTO VAI PARA O BANCO DE PRODUÇÃO e aparece no site no ar. São textos
// inventados: servem para avaliar o layout, não para ficar publicados. Troque
// por mensagens de clientes de verdade antes de divulgar a loja — depoimento
// falso é propaganda enganosa pelo CDC.
//
// As fotos são das próprias peças, de propósito. Rosto de banco de imagens
// como se fosse cliente inventaria uma pessoa, o que é bem pior.
import dotenv from 'dotenv'
import { pool } from '../src/db.js'
dotenv.config()

// Marca que identifica o que foi semeado, para a remoção ser exata e nunca
// encostar numa avaliação real.
const MARCA = '[exemplo]'

const EXEMPLOS = [
  {
    author: 'Marina Alves', handle: 'marinaalves',
    text: 'A jaqueta chegou em dois dias e o caimento ficou perfeito. Dá para ver que foi lavada e revisada antes de enviar.',
    rating: 5, comFoto: true,
  },
  {
    author: 'Bruno Tavares', handle: 'bru.tavares',
    text: 'Comprei achando que ia ser aquela roupa de brechó meio surrada e chegou impecável. Já virou a peça que mais uso.',
    rating: 5, comFoto: true,
  },
  {
    author: 'Camila Ribeiro', handle: 'cacaribeiro',
    text: 'Fiquei em dúvida no tamanho e responderam no direct em minutos. Serviu certinho, e o preço é honesto pelo que veio.',
    rating: 5, comFoto: true,
  },
  {
    author: 'Letícia Nunes', handle: 'lelenunes',
    text: 'Achei uma peça que eu procurava fazia tempo. Chegou embalada com cuidado e um bilhete escrito à mão.',
    rating: 4, comFoto: true,
  },
  {
    author: 'Rafael Menezes', handle: null,
    text: 'Segunda compra na Tropia. O que eles falam da condição da peça bate com o que chega, e isso já é raro.',
    rating: 5, comFoto: false,
  },
]

const remover = process.argv.includes('--remover')

try {
  if (remover) {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE text LIKE $1', [`%${MARCA}`])
    console.log(`${rowCount} avaliação(ões) de exemplo removida(s).`)
  } else {
    const { rows: fotos } = await pool.query(
      `SELECT images[1] AS foto FROM products
        WHERE images IS NOT NULL AND array_length(images,1) > 0`)
    const { rows: pecas } = await pool.query(
      'SELECT id FROM products WHERE sold = FALSE ORDER BY created_at DESC LIMIT 5')

    if (fotos.length === 0) console.warn('Nenhuma peça com foto: os exemplos vão sem imagem.')

    let n = 0
    for (const [i, e] of EXEMPLOS.entries()) {
      // A marca fica NO FIM DO TEXTO e aparece no site de propósito. Duas
      // razões: o --remover acha exatamente estes registros sem chutar por
      // nome, e ninguém que entrar na loja confunde exemplo com depoimento
      // real. É para ser óbvio enquanto estiver no ar.
      await pool.query(
        `INSERT INTO reviews (author, handle, text, rating, photo, product_id, published, position)
              VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
        [
          e.author, e.handle, `${e.text} ${MARCA}`, e.rating,
          e.comFoto ? (fotos[i % Math.max(fotos.length, 1)]?.foto ?? null) : null,
          pecas[i % Math.max(pecas.length, 1)]?.id ?? null,
          i,
        ]
      )
      n++
    }
    console.log(`${n} avaliações de exemplo inseridas.`)
    console.log('Para tirar: npm run seed:avaliacoes -- --remover')
  }
} catch (err) {
  console.error('Falhou:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
