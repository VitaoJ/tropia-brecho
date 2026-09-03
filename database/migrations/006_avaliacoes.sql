-- =============================================
-- Avaliações de clientes na página inicial
-- =============================================

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  author     VARCHAR(120) NOT NULL,   -- nome de quem escreveu
  handle     VARCHAR(80),             -- @ do instagram, opcional
  text       TEXT NOT NULL,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),

  -- Foto da pessoa com a peça. Num brechó vale mais que estrela: prova que
  -- a roupa existe, caiu bem e chegou.
  photo      TEXT,

  -- Peça avaliada, quando dá para amarrar. ON DELETE SET NULL porque vender
  -- a peça não pode apagar o elogio.
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Sai do site sem precisar apagar o registro.
  published  BOOLEAN DEFAULT TRUE,

  -- Ordem manual na home; menor aparece primeiro.
  position   INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A home lê só as publicadas, na ordem
CREATE INDEX IF NOT EXISTS idx_reviews_publicadas
  ON reviews (position, created_at DESC) WHERE published;
