-- Coleções, ordem da página inicial e tags nas peças.
--
-- Coleção é um grupo de peças com nome ("vintage", "Destaques"). Uma delas
-- fica na capa da home, com foto de fundo e uma peça em destaque no cartão;
-- as outras aparecem como faixas de peças, na ordem de home_secoes.

-- Tags: rótulos livres da peça ("anos 90", "customizada"), mostrados na
-- página dela. Guardadas em minúsculas, sem repetir.
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS collections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome             VARCHAR(60)  NOT NULL,         -- o texto grande da capa
  slug             VARCHAR(80)  UNIQUE NOT NULL,  -- /catalogo?colecao=slug
  chamada          VARCHAR(140),                  -- linha de apoio no cartão
  foto_capa        TEXT,                          -- sem foto não vai para a capa
  peca_destaque_id UUID REFERENCES products(id) ON DELETE SET NULL,
  na_capa          BOOLEAN NOT NULL DEFAULT FALSE,
  arquivada        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  -- Coleção arquivada não pode estar na capa.
  CHECK (NOT (na_capa AND arquivada))
);
-- Uma capa por vez: o banco garante, não a tela.
CREATE UNIQUE INDEX IF NOT EXISTS collections_uma_capa ON collections (na_capa) WHERE na_capa;

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  PRIMARY KEY (collection_id, product_id)
);

-- A página inicial, de cima para baixo (a capa é sempre a primeira e não
-- entra aqui). Cada coleção tem uma linha; as seções automáticas também.
CREATE TABLE IF NOT EXISTS home_secoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo          VARCHAR(20) NOT NULL
                CHECK (tipo IN ('colecao', 'ultimas', 'avaliacoes', 'instagram')),
  collection_id UUID UNIQUE REFERENCES collections(id) ON DELETE CASCADE,
  posicao       INTEGER NOT NULL DEFAULT 0,
  visivel       BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK ((tipo = 'colecao') = (collection_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS home_secoes_fixas ON home_secoes (tipo) WHERE tipo <> 'colecao';

-- ── Ponto de partida: a home exatamente como está no ar ──────────
-- A capa de hoje vira a coleção "vintage", com as peças masculinas, que é o
-- que o cartão mostrava. Fica fora das faixas para nada novo aparecer.
WITH capa AS (
  INSERT INTO collections (nome, slug, chamada, foto_capa, peca_destaque_id, na_capa)
  VALUES (
    'vintage', 'vintage', 'Alfaiataria, malha e jeans garimpados',
    'https://res.cloudinary.com/mvsuquav/image/upload/v1788724160/tropia/site/hero-vintage.jpg',
    (SELECT id FROM products
      WHERE gender = 'masculino' AND sold = FALSE AND cardinality(images) > 0
      ORDER BY created_at DESC LIMIT 1),
    TRUE)
  RETURNING id
), pecas AS (
  INSERT INTO collection_products (collection_id, product_id)
  SELECT capa.id, p.id FROM capa, products p
   WHERE p.gender = 'masculino' AND p.sold = FALSE
)
INSERT INTO home_secoes (tipo, collection_id, posicao, visivel)
SELECT 'colecao', id, 4, FALSE FROM capa;

-- As duas seções que o Murilo pediu, vazias. Coleção sem peça não aparece
-- na home, então nada muda até ele escolher as peças.
WITH novas AS (
  INSERT INTO collections (nome, slug, chamada) VALUES
    ('Destaques',    'destaques',    'As peças que a gente mais gosta agora'),
    ('Customizadas', 'customizadas', 'Garimpadas e transformadas por nós')
  RETURNING id, slug
)
INSERT INTO home_secoes (tipo, collection_id, posicao)
SELECT 'colecao', id, CASE slug WHEN 'destaques' THEN 0 ELSE 3 END FROM novas;

-- As seções automáticas, na ordem de hoje: avaliações e depois chegadas.
INSERT INTO home_secoes (tipo, posicao) VALUES ('avaliacoes', 1), ('ultimas', 2);
