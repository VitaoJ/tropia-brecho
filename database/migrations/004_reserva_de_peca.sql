-- =============================================
-- Reserva temporária da peça durante o checkout
-- =============================================

-- Até quando a peça está segurada. Passou da hora, vale como livre: não existe
-- rotina de limpeza, quem consulta é que ignora reserva vencida. Assim não tem
-- cron para quebrar nem estado que fica preso se o servidor cair.
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP;

-- Para quem está reservada. É a sessão de checkout, não o cliente: a compra é
-- sem cadastro, então quem segura a peça é o navegador que está preenchendo.
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_by UUID;

-- Só as reservadas entram no índice; o resto da tabela não paga por ele.
CREATE INDEX IF NOT EXISTS idx_products_reserved
  ON products (reserved_until) WHERE reserved_until IS NOT NULL;
