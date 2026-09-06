# Checklist de Segurança e Limpeza de Código — Tropia Brechó

> Auditado em **06/09/2026**. As caixas marcadas foram **verificadas rodando o
> comando ou chamando a rota**, não por memória. O que ficou aberto está
> resumido logo abaixo, em ordem de risco.

## Pendências desta auditoria

### Crítico — antes de vender

- [ ] **Rotacionar o segredo do Cloudinary e o token do Melhor Envio.** Os dois
  passaram por conversa de chat. Pelo próprio critério deste checklist, chave
  que apareceu em chat está queimada — mesmo que nunca tenha entrado no git
  (e não entrou: confirmei buscando os valores reais em todo o histórico).
- [ ] **Levar as variáveis para o Railway.** `CLOUDINARY_*` e `MELHOR_ENVIO_*`
  existem só no `.env` da máquina. Em produção o upload e a cotação de frete
  não funcionam.
- [ ] **Assinatura do webhook do Mercado Pago.** Ainda não existe porque o
  pagamento não foi implementado. É o item que trava o lançamento.

### Importante

- [ ] **JWT do admin com 7 dias de validade.** Token roubado vale a semana.
- [ ] **Validação sem schema.** A validação é escrita à mão rota a rota, e
  funciona, mas Zod deixaria a regra num lugar só e menos sujeita a esquecimento.
- [ ] **`npm audit`:** 5 moderadas no backend, 2 no frontend (react-router,
  open redirect via barra invertida). Nenhuma alta ou crítica.
- [ ] **Upload valida o tipo pelo que o navegador declara**, não pelo conteúdo.
  O arquivo vai direto para o Cloudinary, que faz a validação real, então o
  risco é baixo — mas o item do checklist não está cumprido do jeito descrito.

## O que foi corrigido durante a auditoria

- Helmet ativado (confirmado: `X-Content-Type-Options`, `X-Frame-Options`,
  `Strict-Transport-Security`, `Referrer-Policy` nas respostas)
- Rate limit no login: 10 tentativas erradas por IP a cada 15 min, acerto não
  gasta tentativa (confirmado: 11ª tentativa devolve 429)
- Teto de 240 req/min no resto da API, e corpo de requisição limitado a 100kb
- `trust proxy` ligado — sem isso o Railway veria um IP só e o limite
  derrubaria a loja inteira junto com o atacante
- `.env.example` completado com as quatro variáveis do Melhor Envio

---

Padrão para os projetos. Copie este arquivo para a raiz do repositório e marque conforme for validando.
Cada item tem o **porquê** e o **como verificar** — o objetivo é conseguir checar sem depender de lembrar o motivo.

**Prioridades:** `[C]` crítico, bloqueia lançamento · `[I]` importante, resolver antes de tratar como produção · `[B]` bom ter.

**Escopo:** projetos estáticos (portfólio, landing pages) usam só os blocos 1, 7, 8, 9 e a Parte 2. Projetos com backend e banco usam tudo.

---

## Parte 1 — Segurança

### 1. Segredos e variáveis de ambiente

- [x] **`[C]` Nenhum segredo no código nem no histórico do git.** Chave de API, token, senha de banco, JWT secret. Apagar em um commit posterior não resolve — a chave continua acessível no histórico.
  *Como verificar:* `git log -p | grep -iE "(api[_-]?key|secret|token|password|Bearer )"` na raiz do repo.
- [x] **`[C]` `.env` no `.gitignore` desde o primeiro commit.** Confirme também `.env.local`, `.env.production`.
- [ ] **`[C]` Todo segredo já exposto foi rotacionado.** Uma chave que apareceu em chat, print, log ou commit está queimada, mesmo que o repositório seja privado.
- [x] **`[I]` Existe um `.env.example`** com todas as variáveis necessárias e valores fictícios. É o que evita o "funciona local e quebra no ar" por variável esquecida.
- [x] **`[I]` Segredo de backend nunca vai para o frontend.** No Vite, tudo com prefixo `VITE_` é embutido no bundle e fica visível para qualquer visitante. Chave privada do Mercado Pago, service_role do Supabase e JWT secret ficam só no servidor.
- [ ] **`[I]` As mesmas variáveis estão configuradas no painel de cada host** (Vercel, Railway, Supabase) — não só no `.env` da máquina.

### 2. Autenticação

- [x] **`[C]` Senhas com hash (bcrypt ou argon2), nunca em texto puro nem com hash simples tipo MD5/SHA.**
- [x] **`[C]` JWT secret é uma string aleatória longa**, não `"secret"`, não o nome do projeto.
- [ ] **`[I]` Expiração de token compatível com o risco.** *Vindo do planejamento do Tropia:* o admin está com JWT de 7 dias. Para um painel que edita estoque e vê pedidos, isso é bastante — um token roubado vale a semana inteira. Considere 24h, ou access token curto + refresh token.
- [x] **`[I]` Rate limit no login.** Sem isso, um script tenta senha ilimitadamente. `express-rate-limit` resolve em 5 linhas.
- [x] **`[B]` Mensagem de erro de login genérica** ("credenciais inválidas"), não "usuário não existe" — isso entrega quais e-mails estão cadastrados.

### 3. Autorização

- [x] **`[C]` Toda rota `/admin` protegida no backend, não só no frontend.** Esconder o botão no React não protege nada: a rota da API continua respondendo para quem chamar direto. É a falha mais comum em projeto pequeno.
  *Como verificar:* chame um endpoint admin com `curl` sem token e confirme que volta 401.
- [ ] **`[C]` O usuário só acessa os próprios dados.** Se `GET /api/pedidos/123` devolve o pedido de qualquer um que souber o número, é vazamento — ainda que ninguém "veja o link".
- [x] **`[I]` Middleware de auth aplicado por padrão no grupo de rotas**, não item por item. Rota nova esquecida vira brecha.
- [ ] **`[I]` (Supabase) RLS ativado em todas as tabelas** e políticas testadas com a chave anônima. Tabela sem RLS com chave pública no frontend é o cenário exato do vazamento do Moltbook.

### 4. Entrada de dados e banco

- [x] **`[C]` Queries parametrizadas em tudo.** `pool.query('SELECT * FROM produtos WHERE id = $1', [id])`, nunca concatenação de string com input do usuário.
- [ ] **`[C]` Validação no backend, com schema.** Zod ou Joi na entrada de cada rota. Validação no formulário é experiência do usuário, não segurança — a API é chamável direto.
- [x] **`[I]` Campos numéricos e de preço validados de verdade.** Preço, quantidade e desconto nunca vêm do cliente sem recálculo no servidor: quem controla o front controla o valor enviado.
- [x] **`[I]` Nenhum campo sensível volta na resposta da API.** Hash de senha, token, dado interno. Selecione colunas explicitamente em vez de `SELECT *`.
- [x] **`[B]` Migrações versionadas no repositório**, banco de produção nunca alterado só pela interface.

### 5. Pagamento e webhooks

*Base: seção 7.3 do planejamento do Tropia. Mantida e ampliada.*

- [ ] **`[C]` Assinatura do webhook verificada** (header `x-signature` do Mercado Pago) antes de qualquer escrita no banco. Sem isso, qualquer pessoa que descubra a URL marca pedido como pago.
- [ ] **`[C]` `payment_id` reconsultado na API do Mercado Pago** antes de atualizar o pedido. Confie na consulta, não no corpo da notificação.
- [x] **`[C]` Valor do pedido calculado no servidor**, a partir dos preços do banco. Nunca aceite o total enviado pelo frontend.
- [ ] **`[I]` Webhook idempotente.** O Mercado Pago reenvia notificação; processar duas vezes não pode duplicar pedido nem baixar estoque duas vezes. Guarde o `payment_id` já processado.
- [ ] **`[I]` Retorno HTTP 200 imediato, processamento assíncrono.**
- [ ] **`[I]` Log de todos os eventos de webhook** para auditoria — sem gravar dados de cartão.

### 6. Upload de arquivos

- [ ] **`[C]` Tipo validado pelo conteúdo, não pela extensão.** `.jpg` no nome não garante imagem.
- [ ] **`[I]` Limite de tamanho e de quantidade** por requisição.
- [x] **`[I]` Nome do arquivo gerado pelo servidor** (UUID), nunca o nome enviado — evita path traversal e sobrescrita.
- [x] **`[B]` Arquivos servidos de storage dedicado**, não da mesma pasta do código da aplicação.

### 7. CORS, headers e transporte

- [x] **`[C]` HTTPS em tudo**, sem conteúdo misto (imagem ou script em `http://` numa página `https://`).
- [x] **`[I]` CORS com lista explícita de origins.** `origin: '*'` num backend com autenticação é brecha. Lembre de incluir o domínio de produção — a falha clássica é ter só `localhost:5173` liberado.
- [x] **`[I]` Helmet ativo no Express** (headers de segurança padrão em uma linha).
- [ ] **`[B]` Cookies com `httpOnly`, `secure` e `sameSite`**, se estiver usando cookie em vez de header.

### 8. Dependências

- [ ] **`[I]` `npm audit` sem vulnerabilidade alta ou crítica.**
- [x] **`[I]` Lockfile commitado** (`package-lock.json`).
- [ ] **`[B]` Dependências não usadas removidas** — cada pacote é superfície de ataque a mais. `npx depcheck` lista.

### 9. Dados pessoais e LGPD

- [x] **`[C]` Nenhum dado de cartão trafega ou é armazenado pela aplicação.** O checkout do Mercado Pago existe exatamente para isso.
- [x] **`[I]` Logs sem dado pessoal.** CPF, e-mail, endereço e token não vão para `console.log` em produção — logs de host são acessíveis a quem tiver acesso ao painel.
- [ ] **`[I]` Só os dados realmente necessários são coletados**, com finalidade clara na tela.
- [ ] **`[B]` Política de privacidade publicada** e um canal para pedido de exclusão de dados.

---

## Parte 2 — Limpeza de código

- [ ] **Sem `console.log` de depuração em produção.** Manter só log intencional de servidor.
- [ ] **Sem código morto:** função não chamada, import não usado, arquivo órfão, bloco comentado "por garantia". O git é o histórico — não precisa de código comentado.
- [ ] **Sem valor hardcoded que deveria ser configuração:** URL de API, e-mail de contato, taxa de desconto, chave de teste.
- [ ] **Tratamento de erro real nas rotas.** `catch` que só faz `console.log` esconde falha; devolva status e mensagem coerentes e registre o erro.
- [ ] **Nomenclatura consistente em todo o projeto.** Escolha um idioma para nomes de variável e mantenha; padronize `camelCase` no JS e `snake_case` no banco, com uma camada de conversão só se precisar.
- [ ] **Duplicação extraída.** Mesma lógica em três lugares vira função ou hook. Corrigir um bug em três arquivos é como bug volta.
- [ ] **Estrutura de pastas previsível:** `routes/`, `controllers/`, `middleware/`, `db/` no backend; `pages/`, `components/`, `hooks/`, `lib/` no front. Vale tanto para você quanto para o contexto que a IA recebe.
- [ ] **ESLint + Prettier configurados e rodados** — acaba a discussão de estilo e o diff fica limpo.
- [ ] **`README.md` com o mínimo:** o que é, como rodar local, variáveis necessárias, como fazer deploy.
- [ ] **`CLAUDE.md` / `AGENTS.md` atualizado e enxuto.** Stack, decisões de arquitetura, o que não mexer. Curto e priorizado funciona melhor que exaustivo.
- [ ] **Nada de arquivo de teste manual, `.zip`, dump ou print commitado.**

---

## Parte 3 — Antes de anunciar que está no ar

- [ ] Variáveis configuradas em **todos** os hosts, não só num.
- [ ] Nenhum segredo no histórico do git.
- [ ] Migração de banco rodada em produção.
- [ ] Domínio apontado e HTTPS válido.
- [ ] Fluxo crítico testado **em produção**, não só local (no Tropia: comprar de verdade e conferir se o webhook marcou como pago).
- [ ] Alguma forma de saber se caiu — mesmo que seja um uptime monitor gratuito.
- [ ] Backup do banco configurado, ou pelo menos um dump manual guardado.

---

## Registro por projeto

| Projeto | Data da revisão | Itens críticos pendentes |
|---|---|---|
| tropia-brecho | 06/09/2026 | 3 (rotacionar chaves · variáveis no Railway · assinatura do webhook) |
| PJI — plataforma de vagas | | |
| KansoWeb | | |
| Anagrame | | |
| Portfólio Felipe | | |
| Site Gráfica Daniel | | |
