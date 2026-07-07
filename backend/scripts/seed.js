// Popula o banco com peças de teste: node scripts/seed.js
import { pool, query } from '../src/db.js'

const { rows: categorias } = await query('SELECT id, slug FROM categories')
const cat = Object.fromEntries(categorias.map(c => [c.slug, c.id]))

const pecas = [
  { name: 'Blusa Vintage Gola Alta', description: 'Blusa de tricô com gola alta, tons terrosos. Peça dos anos 90 em ótimo estado.', price: 49.00, categoria: 'feminino', size: 'M', gender: 'feminino', condition: 'otimo' },
  { name: 'Calça Wide Leg Alfaiataria', description: 'Calça de alfaiataria wide leg, cintura alta. Caimento impecável.', price: 89.00, categoria: 'feminino', size: '38', gender: 'feminino', condition: 'otimo' },
  { name: 'Vestido Midi Floral', description: 'Vestido midi com estampa floral em tons terrosos. Decote V e manga bufante.', price: 98.00, categoria: 'feminino', size: 'P', gender: 'feminino', condition: 'otimo' },
  { name: 'Jaqueta Jeans Oversized', description: 'Jaqueta jeans lavagem média, modelagem oversized unissex.', price: 120.00, categoria: 'masculino', size: 'G', gender: 'unissex', condition: 'bom' },
  { name: 'Camisa Social Listrada', description: 'Camisa social de algodão com listras finas. Ideal para looks casuais.', price: 55.00, categoria: 'masculino', size: 'M', gender: 'masculino', condition: 'bom' },
  { name: 'Tênis Casual Couro', description: 'Tênis de couro branco, solado de borracha. Pouquíssimo uso.', price: 140.00, categoria: 'calcados', size: '41', gender: 'masculino', condition: 'otimo' },
  { name: 'Sandália Plataforma', description: 'Sandália plataforma em couro caramelo, anos 70 vibes.', price: 75.00, categoria: 'calcados', size: '36', gender: 'feminino', condition: 'bom' },
  { name: 'Bolsa Tiracolo Couro', description: 'Bolsa tiracolo de couro legítimo, ferragens douradas.', price: 85.00, categoria: 'acessorios', size: null, gender: 'feminino', condition: 'otimo' },
  { name: 'Cinto Couro Fivela Dourada', description: 'Cinto de couro marrom com fivela dourada vintage.', price: 32.00, categoria: 'acessorios', size: null, gender: 'unissex', condition: 'regular' },
  { name: 'Saia Midi Plissada', description: 'Saia midi plissada em tom areia, cintura alta com elástico.', price: 58.00, categoria: 'feminino', size: 'M', gender: 'feminino', condition: 'otimo' },
]

for (const p of pecas) {
  await query(
    `INSERT INTO products (name, description, price, category_id, size, gender, condition, images)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [p.name, p.description, p.price, cat[p.categoria] ?? null, p.size, p.gender, p.condition, []]
  )
  console.log(`✓ ${p.name}`)
}

await pool.end()
console.log(`\n${pecas.length} peças inseridas.`)
