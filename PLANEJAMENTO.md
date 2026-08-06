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
| Reserva | 10 min preenchendo, 30 min com pedido criado |
| Datas no banco | `TIMESTAMPTZ` — nunca `TIMESTAMP` (ver tarefa 4) |
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

### 3. Backend de pedidos ✅

- [x] `POST /api/pedidos` — cria cliente, endereço, pedido e itens numa transação
- [x] Validar que toda peça ainda está disponível antes de criar
- [x] Recalcular o total no servidor (nunca confiar no valor que vem do front)
- [x] `GET /api/pedidos` e `PUT /api/pedidos/:id/status` (admin)
- [x] `GET /api/pedidos/:id/publico` para a página de sucesso, sem CPF nem endereço
- [x] Migration 003: subtotal/desconto/frete separados, cupom e snapshot da peça
- [x] Teste de ponta a ponta: `npm run teste:pedidos` (38 checagens)

**Como o total é fechado:** `backend/src/utils/preco.js`. O navegador pode mandar
`total_esperado`; se não bater com a conta do servidor, o pedido é recusado com
409 em vez de cobrar um valor que o cliente não viu.

⚠️ **Risco de divergência:** frete e desconto do PIX existem em dois arquivos,
`frontend/src/utils/preco.js` e `backend/src/utils/preco.js`. Mudar um sem o
outro faz o checkout recusar todo pedido com 409. Mexeu em um, mexa no outro.

**Status:** `pending → paid → shipped → delivered`, e `cancelled` a partir de
qualquer um antes de entregue. Não anda para trás nem pula etapa. Confirmar dá
baixa na peça e conta o uso do cupom; cancelar desfaz os dois.

⚠️ **Teste roda contra o banco de produção** (é o que está no `.env`). O script
limpa o que cria, mas se for interrompido no meio deixa pedido de teste no
painel. Vale criar um banco separado de teste quando sobrar tempo.

---

### 4. Reserva de peça ✅

- [x] Migration 004: `reserved_until` e `reserved_by` em products
- [x] `POST /api/reservas` — segura por 10 min; renova a cada etapa concluída
- [x] `POST /api/reservas/liberar` — devolve ao sair (sendBeacon)
- [x] Reserva vencida vale como livre, sem rotina de limpeza
- [x] Pedido criado estende a reserva para 30 min (tempo do PIX)
- [x] Mensagem separa "vendida" de "reservada por outra pessoa"
- [x] `reservada` exposto em `GET /produtos` e `/produtos/:id`
- [x] `useReserva` no front, com contador e devolução na saída
- [ ] Contador visível no checkout — junto com a tarefa 5

**Por que expira em vez de "soltar quando sair":** não dá para saber quando
alguém saiu. Fechar a aba às vezes avisa (`pagehide` + `sendBeacon`); ficar sem
sinal, trocar de app no celular ou o navegador matar a aba, nunca. Então o
prazo é a garantia e o aviso de saída é só um atalho que devolve mais cedo.

**Não existe listener de `visibilitychange`** de propósito: no celular, sair da
aba é o que todo mundo faz para copiar o CPF ou abrir o app do banco. Soltar a
peça nisso quebraria justamente quem está comprando.

**10 min no formulário, 30 min depois do pedido criado.** O código PIX do
Mercado Pago vive ~30 min: se a reserva morresse aos 10, a peça voltaria à
vitrine e alguém compraria uma peça que o primeiro ainda está pagando.

**Bug de fuso horário encontrado aqui (migration 005).** As colunas eram
`TIMESTAMP`, que não guarda fuso. O Postgres do Railway roda em UTC e o Node
no fuso de quem sobe o servidor, então o mesmo instante era lido com 3 horas de
diferença: `reserved_until > NOW()` dizia que a reserva tinha vencido enquanto
o JavaScript dizia que ainda valia. Todas as colunas de instante viraram
`TIMESTAMPTZ`. Isso também corrige a data dos pedidos no painel, que apareceria
3 horas adiantada. `coupons.valid_until` continua `DATE` de propósito.

---

### 5. Checkout em 3 etapas ✅

- [x] Etapa 1 — dados: e-mail primeiro (para recuperar abandono), nome, CPF, telefone
- [x] Etapa 2 — endereço com ViaCEP preenchendo por CEP
- [x] Etapa 3 — escolha entre PIX e cartão, com o total de cada um
- [x] Resumo fixo do pedido em todas as etapas
- [x] Validação por etapa, sem deixar avançar incompleto
- [x] Contador da reserva na tela (item que faltava da tarefa 4)
- [x] Aviso quando uma peça cai no meio, com botão de tirar e seguir
- [x] Rascunho do formulário no localStorage, sobrevive a recarregar
- [x] Página `/pedido/:id` com o número do pedido e o resumo

**Conferido no navegador, de ponta a ponta:** validação recusando CPF e e-mail
inválidos, máscaras, ViaCEP preenchendo Avenida Paulista, contador reiniciando
a cada etapa, pedido gravado com endereço e snapshot das peças, carrinho
esvaziado, reserva estendida para 30 min. Também testei a peça sumindo no meio
do checkout (baixa no painel com o cliente preenchendo): o pedido é barrado,
o aviso diz qual peça e por quê, e "tirar do carrinho e seguir" fecha o pedido
com o que sobrou.

⚠️ **`PAGAMENTO_ATIVO = false` em `PedidoConfirmado.jsx`.** Enquanto o Mercado
Pago não entra, o site cria o pedido mas ninguém consegue pagar — a tela diz
isso e promete contato por e-mail. **Virar para `true` na tarefa 6.** Enquanto
estiver assim, todo pedido nasce `pending` e as peças ficam seguradas 30 min.

---

### 6. Mercado Pago
- [ ] Access token nas variáveis do Railway (Vitor)
- [ ] `POST /api/pagamentos/criar` gerando preferência (Checkout Pro)
- [ ] `POST /api/pagamentos/webhook` confirmando pagamento
- [ ] Ao confirmar: pedido vira `paid`, peça vira `sold`, cupom incrementa uso
- [ ] Páginas de retorno: sucesso, pendente, falha
- [ ] Testar com credenciais de sandbox

---

### 7. Upload de fotos no admin ✅

- [x] Upload direto no formulário da peça, com barra de progresso
- [x] Reordenar com setas (a primeira leva selo de CAPA)
- [x] Remover foto
- [x] Compressão antes de subir e webp na entrega
- [x] Colar URL continua existindo, para as peças antigas
- [x] Testado de ponta a ponta com as credenciais reais
- [ ] **Vitor: colar as 3 variáveis no Railway** — já estão no `.env` local

**Upload assinado, não preset público.** O Cloudinary aceita upload direto do
navegador com "preset não assinado", mais simples — mas o preset ficaria
visível no código do site e qualquer um poderia mandar arquivo para a conta,
que é paga por armazenamento. Aqui o segredo fica no servidor: o painel pede
uma assinatura (`POST /api/upload/assinatura`, só para admin logado) e o
arquivo vai do celular direto para o Cloudinary, sem passar pelo Railway.

**O que falta para funcionar** — três variáveis no Railway (e no `backend/.env`
para testar local), tiradas de cloudinary.com → Settings → API Keys:

| Variável | Onde achar |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | já sabemos: `mvsuquav` |
| `CLOUDINARY_API_KEY` | painel do Cloudinary |
| `CLOUDINARY_API_SECRET` | painel do Cloudinary (é segredo, nunca no front) |

Enquanto não estiverem definidas, o painel mostra o aviso e continua aceitando
URL colada — nada quebra.

**Peso das fotos, medido nas peças reais:**

| | Tamanho |
|---|---|
| Original no Cloudinary | 4,9 MB |
| Card do catálogo (`w_600`) | 32 KB |
| Miniatura do painel (`w_300`) | 13 KB |

O catálogo carrega 12 peças por página. Sem isso seriam ~59 MB por página no
4G; agora são ~390 KB. A transformação vai na URL de entrega
(`f_auto,q_auto,c_limit,w_N`), então o original fica intacto e cada tela pede o
tamanho de que precisa.

**Antes de subir, a foto é reduzida no navegador** para no máximo 2000px de
lado. O `imageOrientation: 'from-image'` não é enfeite: sem ele, foto tirada em
pé sobe deitada, porque a rotação vive só no EXIF.

Medido subindo uma foto de 3000×2000 pelo painel:

| Etapa | Tamanho |
|---|---|
| Arquivo escolhido | 5,0 MB (3000×2000) |
| Depois do preparo, o que sobe | 39 KB (2000×1333) |
| O que o card entrega | 4,6 KB, webp |

⚠️ **Remover uma foto do formulário não apaga do Cloudinary**, só tira a
referência — quem remove por engano e fecha sem salvar não perde nada. Existe
`POST /api/upload/remover` para apagar de vez, restrito à pasta `tropia/pecas`
para um id qualquer não apagar outra imagem da conta. Ainda não tem botão.

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
