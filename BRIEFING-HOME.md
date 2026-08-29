# Tropia Brechó — Briefing para redesenho da Home

Documento para colar no Claude Design. Duas partes: **o que existe hoje**
(para não reinventar o que já está decidido) e **o que precisa ser desenhado**.

---

# PARTE 1 — ESTADO ATUAL

## O que é a Tropia

Brechó brasileiro de roupas de segunda mão, com loja online própria.
Não é marketplace, não é fast fashion. Uma pessoa garimpa cada peça.

**A regra que define o negócio:** cada peça existe em **uma única unidade**.
Não tem grade de tamanhos, não tem reposição. O que sai, não volta.

Isso não é detalhe de catálogo — é a diferença entre a Tropia e uma loja
comum, e é o que o design precisa fazer parecer verdade.

## Público

Maioria absoluta acessa **pelo celular**. Mulheres e homens jovens,
interessados em moda circular, preço acessível e peça que ninguém mais tem.
Compra por impulso e por garimpo, não por necessidade.

## Paleta (fechada — é a identidade do cliente, não mexer)

| Papel | Hex | Uso hoje |
|---|---|---|
| Fundo | `#eae1d4` | fundo geral do site, bege claro |
| Escuro | `#250000` | texto principal, blocos escuros (marrom quase preto) |
| Marrom | `#432d1c` | faixas escuras secundárias |
| Areia | `#e0d4c2` | superfícies levemente elevadas |
| Apagado | `#654a2b` | texto secundário, rótulos |
| Borda | `#d6c8b3` | linhas e divisórias |
| Destaque | `#ffc509` | amarelo — usado com parcimônia, só onde importa |

Superfícies de card usam `#f2ead9`.

## Tipografia

**Libre Franklin** (Google Fonts, variável 100–900) — é o revival open source
da ATF Franklin Gothic, que será licenciada depois. O `@font-face` já está
preparado no CSS; quando a licença sair, só troca os arquivos.

O que já foi testado e **aprovado** pelo cliente:
- Hero em **900 (Black) itálico**, `letter-spacing: -0.05em`, `line-height: 0.86`
- Títulos de seção em corpo pequeno, `tracking` largo (0.32em), maiúsculas

O que foi testado e **rejeitado**:
- Black itálico nos nomes das categorias — ficou pesado demais, foi revertido

## Estrutura atual da Home

1. **Hero** — bloco escuro `#250000` com textura de grão. Linha de metadados
   "ACERVO ——— NN PEÇAS", título gigante "UMA PEÇA. / UMA CHANCE." (segunda
   linha em amarelo), parágrafo curto, botão "VER O ACERVO", e a foto de uma
   peça em destaque invadindo a coluna do texto no desktop.
2. **Ticker** — faixa horizontal com texto rolando.
3. **Índice de categorias** — lista numerada 01–04 (Feminino, Masculino,
   Calçados, Acessórios), fundo escuro sobe no hover.
4. **Manifesto** — faixa `#432d1c` com 4 princípios:
   - Cada peça é escolhida e revisada à mão
   - Peça única — uma unidade de cada, sem reposição
   - Moda circular — roupa que volta a circular em vez de virar lixo
   - Brasil inteiro — frete para todo o país
5. **Destaques** — grade de peças com numeração de arquivo (01, 02, 03...).

## Realidade do estoque — LEIA ANTES DE DESENHAR

**8 peças cadastradas. 7 delas não têm foto nenhuma.**

| Peça | Preço | Gênero | Tam | Fotos |
|---|---|---|---|---|
| Jaqueta jeans Vintage | R$ 55 | feminino | P | **5** |
| Boina Lã | R$ 35 | unissex | — | 0 |
| Sueter Lã Fidodido | R$ 75 | masculino | G | 0 |
| Sapato Loafer Branco | R$ 70 | feminino | 35 | 0 |
| Camisa Social Listrada | R$ 55 | masculino | M | 0 |
| Jaqueta Jeans Oversized | R$ 120 | unissex | G | 0 |
| Vestido Midi Floral | R$ 98 | feminino | P | 0 |
| Blusa Vintage Gola Alta | R$ 49 | feminino | M | 0 |

Faixa de preço real: **R$ 35 a R$ 120**.

**Consequência para o design:** um layout que dependa de muitas fotos bonitas
e consistentes vai parecer quebrado na loja de verdade. O desenho precisa
funcionar com poucas fotos, fotos irregulares (fundo de quarto, luz de
celular) e peças sem foto alguma. Tipografia, cor e composição têm que
sustentar a página sozinhas quando a foto falta.

## Regras comerciais que aparecem na tela

- Frete fixo **R$ 14,90**, grátis acima de **R$ 150**
- **5% de desconto no PIX**, acumulável com cupom
- Peça reservada por 10 min no checkout
- Condições: Ótimo, Bom, Regular

## Restrições técnicas

- **React 18 + Vite + Tailwind CSS.** Sem bibliotecas pesadas de animação.
  CSS puro é preferido; `transition` é preferido a `animation` (já tivemos bug
  de conteúdo preso invisível com `animation ... both`).
- Fotos no **Cloudinary**, entregues com `srcset` em várias resoluções.
  Proporção usada nas peças: **3:4 (retrato)**.
- Precisa respeitar `prefers-reduced-motion`.
- Mobile-first de verdade: desenhar a partir de **390px** de largura.
- Existe navbar fixa no topo e, no celular, barra de navegação inferior —
  a Home vive entre as duas.

## Site no ar

https://tropia-brecho.vercel.app

---

# PARTE 2 — O QUE PRECISA SER DESENHADO

## O pedido

Uma **nova cara para a hero e para a página inicial**.

## O que está errado hoje

A hero atual é um bloco escuro com tipografia grande e uma foto ao lado.
Funciona, mas:

- **Depende da foto.** Com uma peça fotografada de oito, a composição fica
  frágil. Se a peça em destaque não tiver foto, o bloco desmonta.
- **A frase "UMA PEÇA. UMA CHANCE." carrega tudo sozinha.** Se ela não pegar,
  não sobra mais nada — não há segunda camada de interesse.
- **A promessa de garimpo não aparece.** O texto diz que as peças são únicas,
  mas o layout é o de qualquer loja: bloco escuro, título, botão.
- No celular, a foto empurra o conteúdo para baixo e a página começa lenta
  em ritmo visual.

## O que a hero precisa fazer

Em ordem de prioridade:

1. **Dizer, em três segundos, que aqui cada peça é única e não volta.**
   Sem cartaz de "ÚLTIMAS UNIDADES" e sem contador falso — a escassez aqui é
   real e merece ser tratada com honestidade, não com truque de e-commerce.
2. **Levar para o catálogo.** É a única ação que importa nessa altura.
3. **Parecer um acervo, não uma vitrine.** A sensação certa é a de abrir uma
   arara garimpada, ou folhear um fanzine de moda — não a de entrar num
   shopping.
4. **Sobreviver sem foto.** Precisa ficar bom mesmo com zero ou uma imagem.

## O resto da página

Também aberto a redesenho, mantendo as funções:

- **Categorias** — Feminino, Masculino, Calçados, Acessórios
- **Destaques** — mostrar peças reais com preço, tamanho e desconto quando
  houver
- **Manifesto** — os 4 princípios acima
- Um caminho claro para o catálogo em mais de um ponto da página

Pode reordenar, fundir ou cortar seções, desde que essas funções continuem.

## Direção de tom

**Perseguir:** editorial, impresso, artesanal, garimpo, arquivo, fanzine,
tipografia com personalidade, assimetria, respiro.

**Evitar:** cara de template de e-commerce, carrossel de banners, grade de
quatro caixas iguais, "OFERTAS IMPERDÍVEIS", gradiente roxo, ícones genéricos
de caminhãozinho e cadeado, urgência inventada.

## Entregáveis desejados

1. Hero em **duas telas**: 390px (celular) e 1440px (desktop)
2. Página inicial completa, do topo ao rodapé, nas duas larguras
3. Indicação de movimento: o que anima, quando e por quê
4. Se propuser mudança de tipografia ou de uso da paleta, justificar

## O que já está decidido e não deve mudar

- A paleta de sete cores (é a identidade do cliente)
- A família Franklin Gothic
- As quatro categorias
- Frete grátis a partir de R$ 150 e 5% no PIX aparecem em algum lugar
- O site continua sendo mobile-first
