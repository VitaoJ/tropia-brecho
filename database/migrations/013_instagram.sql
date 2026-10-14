-- Faixa do Instagram no fim da home.
--
-- Os posts são cadastrados no painel: link do post + uma imagem subida para
-- o Cloudinary. A imagem não vem do Instagram de propósito — baixar de lá
-- fere os termos deles e o link da imagem expira em dias; o embed oficial
-- carrega o script de rastreamento da Meta e pesa no celular.
CREATE TABLE IF NOT EXISTS instagram_posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url        TEXT NOT NULL UNIQUE,   -- https://www.instagram.com/p/<código>/
  imagem     TEXT,                   -- sem imagem o post não aparece no site
  posicao    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Os três posts que o perfil tem hoje, na ordem da grade. Esperam a imagem.
INSERT INTO instagram_posts (url, posicao) VALUES
  ('https://www.instagram.com/p/DdWbbYfEale/', 0),
  ('https://www.instagram.com/p/DdG4GEkEStU/', 1),
  ('https://www.instagram.com/p/DdCA7x2EY-X/', 2)
ON CONFLICT (url) DO NOTHING;

-- Por último na home, logo antes da faixa que encosta no rodapé.
INSERT INTO home_secoes (tipo, posicao)
SELECT 'instagram', COALESCE(MAX(posicao), -1) + 1 FROM home_secoes;
