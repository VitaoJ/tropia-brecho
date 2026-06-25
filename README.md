# 🛍️ Tropia Brechó

Site completo do Tropia Brechó — loja online mobile-first com carrinho, checkout, pagamento online e dashboard admin.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL |
| Pagamento | Mercado Pago |
| Hospedagem frontend | Vercel |
| Hospedagem backend | Railway |

## Estrutura do projeto

```
tropia-brecho/
├── frontend/        → React (site público + dashboard admin)
├── backend/         → Node.js + Express (API REST)
├── database/        → Migrations SQL
└── README.md
```

## Como rodar localmente

### Backend
```bash
cd backend
npm install
cp .env.example .env   # preencha as variáveis
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # preencha as variáveis
npm run dev
```

## Páginas do site

- `/` — Home (carrossel + ticker infinito + categorias + destaques)
- `/catalogo` — Catálogo com filtros por categoria, tamanho e preço
- `/produto/:id` — Página individual da peça
- `/carrinho` — Carrinho de compras
- `/checkout` — Checkout com pagamento via Mercado Pago
- `/admin` — Dashboard do dono (protegido por login)

## Seções da dashboard admin

- Visão geral (receita, pedidos, peças em estoque)
- Gerenciar produtos (adicionar, editar, remover peças)
- Pedidos (clientes que pagaram, status de envio)
- Relatórios (gráficos de vendas por período)
