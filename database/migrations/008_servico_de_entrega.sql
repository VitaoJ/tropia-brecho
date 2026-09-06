-- Qual serviço de entrega o cliente escolheu (ex.: "PAC · Correios").
-- Guardado como texto porque é o que vai na conversa com o cliente e na
-- etiqueta; o id numérico do Melhor Envio muda de ambiente e não serve de
-- histórico.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service VARCHAR(120);
