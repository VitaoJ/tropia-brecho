# Tropia Brechó — Contexto do Projeto

## O que é
Site e-commerce mobile-first para brechó de roupas e acessórios de segunda mão.
Repositório: github.com/VitaoJ/tropia-brecho

## Stack
- **Frontend**: React + Vite + Tailwind CSS → deploy na Vercel
- **Backend**: Node.js + Express → deploy no Railway
- **Banco**: PostgreSQL → Railway
- **Pagamento**: Mercado Pago (PIX com 5% desconto + cartão)

## Identidade visual
- Paleta: neutros elegantes — preto `#1A1A18`, off-white `#F5F2EE`, areia `#E8E2D8`, mudo `#8C8278`, borda `#DDD8D0`
- Abordagem: **mobile-first** (tudo pensado primeiro para celular)
- Logos: `logo.svg` (só texto, estilo handmade) + `tropia-desenho.svg` (símbolo orgânico)

## Estrutura de pastas
```
frontend/src/
  pages/           → Home, Catalogo, Produto, Carrinho, Checkout
  pages/admin/     → Login, Dashboard
  components/      → layout, ui, product, cart, admin
  services/        → chamadas à API
  context/         → CartContext, AuthContext

backend/src/
  routes/          → produtos, pedidos, pagamentos, auth
  controllers/     → lógica de negócio
  middlewares/     → auth JWT (requireAdmin)
  models/          → queries PostgreSQL

database/migrations/
  001_create_tables.sql  → schema completo já criado
```

## Páginas do site público
| Rota | Página |
|------|--------|
| `/` | Home |
| `/catalogo` | Catálogo com filtros |
| `/produto/:id` | Detalhe da peça |
| `/carrinho` | Carrinho |
| `/checkout` | Checkout 3 etapas |
| `/admin` | Login admin |
| `/admin/dashboard` | Dashboard do dono |

## Homepage — componentes em ordem
1. **Navbar** — logo símbolo (esq.) + "TROPIA" (centro) + busca/carrinho (dir.)
2. **Ticker superior** — fundo `#1A1A18`, rola para direita: `sustentabilidade · moda circular · peças únicas · segunda mão · estilo atemporal`
3. **Carrossel hero** — 3 slides full screen, texto no canto inferior esquerdo, cada slide leva a uma seção:
   - Slide 1 → `/catalogo?categoria=feminino`
   - Slide 2 → `/catalogo?categoria=masculino`
   - Slide 3 → `/catalogo?categoria=calcados`
4. **Ticker inferior** — fundo `#E8E2D8`, rola para esquerda (invertido): `frete para todo brasil · peças selecionadas · moda consciente · vintage & clássico`
5. **Categorias** — grid 2×2: Feminino, Masculino, Calçados, Acessórios
6. **Destaques** — grid 2×2 de produtos
7. **Bottom Nav** — fixo: Home / Catálogo / Favoritos / Carrinho

## Página de produto — componentes em ordem
1. Navbar com botão voltar (← Catálogo)
2. Carrossel de fotos (swipe), contador "1/3" no canto superior direito
3. Tags + nome + marca/época
4. Preço + badge Pix (5% desconto)
5. Chip de tamanho + equivalência em cm
6. Condição: Ótimo (verde) / Bom (amarelo) / Regular (laranja) + badge "Verificado"
7. Tabela de medidas: ombro, busto, cintura, comprimento, manga
8. Descrição da peça
9. CTA: botão "Adicionar ao carrinho" (full width) + botão favorito
10. Peças similares: scroll horizontal, mesma categoria/gênero + tags parecidas

## Banco de dados — tabelas principais
- `products` — name, price, size, gender, condition, images[], sold, category_id
- `categories` — Feminino, Masculino, Calçados, Acessórios (já inseridas)
- `customers` — name, email, phone, cpf
- `addresses` — street, city, state, zip_code
- `orders` — total, status (pending/paid/shipped/delivered/cancelled), payment_id
- `order_items` — order_id, product_id, price
- `admins` — email, password_hash

## API — rotas principais
- `GET  /api/produtos` — listar peças (filtros: categoria, tamanho, gênero)
- `GET  /api/produtos/:id` — detalhe
- `POST /api/produtos` — criar (admin)
- `POST /api/pedidos` — criar pedido
- `POST /api/pagamentos/criar` — preferência Mercado Pago
- `POST /api/pagamentos/webhook` — notificação MP
- `POST /api/auth/login` — login admin (JWT)

## Fluxo de pagamento
1. Frontend → POST /api/pedidos → backend cria pedido (status: pending)
2. Backend → chama MP → recebe init_point
3. Frontend → redireciona para tela MP
4. Cliente paga → MP dispara webhook
5. Backend verifica → atualiza pedido para "paid" + marca produto como sold=true

## Dashboard admin — seções
- **Visão geral**: receita do mês, pedidos, peças em estoque, ticket médio
- **Estoque**: CRUD de peças + upload de fotos
- **Pedidos**: tabela com cliente, peças, valor, status, método de pagamento
- **Relatórios**: vendas por mês (barras), categorias (pizza), estoque vs vendas (linha)

## Decisões tomadas
- Peças similares: mesma categoria + gênero + tags em comum, máx. 6, scroll horizontal
- Desconto Pix: 5% fixo, calculado no backend
- Condição das peças: 3 níveis (Ótimo/Bom/Regular) — pode ser alterado depois
- Carrinho: Context API + localStorage
- Checkout: 3 etapas (dados pessoais → endereço via ViaCEP → pagamento)
- Auth admin: JWT com expiração de 7 dias
