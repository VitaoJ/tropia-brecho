# Tropia Brechó — Planejamento

Documento vivo. Cada tarefa tem escopo fechado para ser feita de uma vez.
Marcar `[x]` ao concluir.

---

## Estado atual

### Pronto

**Site**
- Home responsiva: carrossel hero com 3 slides, tickers, categorias, destaques
- Catálogo com filtros (categoria, tamanho, gênero, condição) guardados na URL,
  painel deslizante no mobile, coluna lateral no desktop, paginação de 12 em 12
- Página de peça: galeria com setas, swipe, teclado e miniaturas; preço com
  desconto e PIX; condição; medidas; peças similares
- Favoritos com localStorage
- Layout responsivo: navbar com links no desktop, barra inferior no mobile

**Painel admin**
- Login com JWT (7 dias)
- CRUD de estoque com desconto por peça (preço riscado + atalho de %)
- Cupons: criar, ativar/desativar, excluir, com validade e limite de usos

**Backend**
- Produtos (CRUD + filtros + similares), categorias, filtros disponíveis, auth, cupons
- Migrations 001 e 002 aplicadas no Postgres do Railway
- CORS preparado para produção, healthcheck, tratamento de erro

**Infra**
- Frontend na Vercel: https://tropia-brecho.vercel.app
- Postgres no Railway
- Fotos no Cloudinary (URL colada à mão no admin)

### Decisões tomadas

| Assunto | Decisão |
|---|---|
| Cupom + PIX | Acumulam |
| Cupom em peça com desconto | Vale |
| Frete | R$ 14,90 fixo, grátis acima de R$ 150 |
| Endereço | ViaCEP |
| Checkout | Sem cadastro (convidado) |
| Gateway | Mercado Pago — Checkout Pro primeiro, Bricks depois |
| Desconto PIX | 5%, acumulável |
| Peça | Única, estoque 1 |
| Tipografia | Franklin Gothic (Libre Franklin até licenciar a ATF) |

---

## Tarefas

### 1. Deploy do backend no Railway ✅

- [x] Serviço a partir do GitHub, root directory `backend`
- [x] Variáveis: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT=8080`
- [x] Domínio: https://tropia-brecho-production.up.railway.app
- [x] `VITE_API_URL` na Vercel + redeploy
- [ ] Apagar o serviço Postgres vazio que sobrou

**Pegadinhas encontradas, para não repetir:**
- Root Directory precisa ser `backend`, senão o Railpack olha a raiz do repo
- Rede interna do Railway não aceita TLS; só o proxy público aceita
- Hoje aponta para a URL **pública** do banco. Depois de apagar o Postgres
  vazio, dá para voltar à interna, que é mais rápida

---

### 2. Tela do carrinho ✅

- [x] Lista de peças com foto, nome, tamanho, preço e remover
- [x] Resumo: subtotal, desconto de cupom, frete, total no cartão e no PIX
- [x] Campo de cupom usando `POST /api/cupons/validar`
- [x] Barra de progresso do frete grátis ("faltam R$ X")
- [x] Economia do PIX em reais
- [x] Aviso de peça única
- [x] Estado vazio
- [x] Cross-sell "combina com" (categoria diferente, mesmo gênero)

**Decisão:** o frete grátis considera o valor **depois** do cupom. Trocar em
`Carrinho.jsx`, no `valor` passado à `BarraFrete`, se preferir antes.

---

### 3. Backend de pedidos
- [ ] `POST /api/pedidos` — cria cliente, endereço, pedido e itens numa transação
- [ ] Validar que toda peça ainda está disponível antes de criar
- [ ] Recalcular o total no servidor (nunca confiar no valor que vem do front)
- [ ] `GET /api/pedidos` e `PUT /api/pedidos/:id/status` (admin)

---

### 4. Reserva de peça
Duas pessoas podem comprar a mesma peça. Precisa resolver antes de cobrar.

- [ ] Migration: `reserved_until` em products
- [ ] Reservar ao entrar no checkout (15 min)
- [ ] Liberar reserva expirada
- [ ] Mensagem clara para quem perdeu a peça
- [ ] Contador visível no checkout

---

### 5. Checkout em 3 etapas
- [ ] Etapa 1 — dados: nome, e-mail (primeiro campo, para recuperar abandono), CPF, telefone
- [ ] Etapa 2 — endereço com ViaCEP preenchendo por CEP
- [ ] Etapa 3 — pagamento
- [ ] Resumo fixo do pedido em todas as etapas
- [ ] Validação por etapa, sem deixar avançar incompleto

---

### 6. Mercado Pago
- [ ] Access token nas variáveis do Railway (Vitor)
- [ ] `POST /api/pagamentos/criar` gerando preferência (Checkout Pro)
- [ ] `POST /api/pagamentos/webhook` confirmando pagamento
- [ ] Ao confirmar: pedido vira `paid`, peça vira `sold`, cupom incrementa uso
- [ ] Páginas de retorno: sucesso, pendente, falha
- [ ] Testar com credenciais de sandbox

---

### 7. Upload de fotos no admin
Hoje a URL do Cloudinary é colada à mão.

- [ ] Upload direto no formulário da peça
- [ ] Reordenar fotos (a primeira é a capa)
- [ ] Remover foto
- [ ] Compressão e conversão para webp

---

### 8. Painel: pedidos e visão geral
Só faz sentido depois que existirem vendas.

- [ ] Tabela de pedidos com cliente, peças, valor, status, forma de pagamento
- [ ] Mudar status (pago → enviado → entregue)
- [ ] Cartões: receita do mês, pedidos, peças em estoque, ticket médio
- [ ] Gráficos: vendas por mês, por categoria, estoque vs vendido

---

### 9. Depois
- [ ] E-mail de carrinho abandonado (depende de captar e-mail na etapa 1)
- [ ] E-mail de confirmação de pedido e de envio
- [ ] Busca por texto na navbar (o ícone já existe, sem função)
- [ ] Checkout Transparente (Bricks) no lugar do redirecionamento
- [ ] Licenciar a ATF Franklin Gothic (`@font-face` já preparado em `index.css`)
- [ ] Código de rastreio no pedido
