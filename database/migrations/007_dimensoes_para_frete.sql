-- =============================================
-- Peso e medidas da peça, para cotar frete
-- =============================================
--
-- O Melhor Envio exige largura, altura, comprimento e peso de cada item na
-- cotação. Sem isso não há como pedir preço nenhum.
--
-- Fica NULO por padrão de propósito: num brechó cada peça é diferente, e
-- inventar um número por peça seria pior que assumir um padrão declarado.
-- Quando está nulo, o servidor usa o padrão da categoria (ver
-- backend/src/utils/frete.js) e diz que estimou.

ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg   DECIMAL(6,3);  -- kg
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm    SMALLINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm   SMALLINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm   SMALLINT;

-- Correios recusa pacote fora da faixa; travar aqui evita cotação que
-- some na hora de gerar a etiqueta.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_medidas_plausiveis;
ALTER TABLE products ADD  CONSTRAINT products_medidas_plausiveis CHECK (
  (weight_kg IS NULL OR (weight_kg > 0    AND weight_kg <= 30)) AND
  (width_cm  IS NULL OR (width_cm  >= 1   AND width_cm  <= 100)) AND
  (height_cm IS NULL OR (height_cm >= 1   AND height_cm <= 100)) AND
  (length_cm IS NULL OR (length_cm >= 1   AND length_cm <= 100))
);
