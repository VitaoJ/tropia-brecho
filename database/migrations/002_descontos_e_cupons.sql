-- =============================================
-- Descontos por peça + cupons
-- =============================================

-- Preço anterior ("de"). Quando preenchido e maior que price,
-- o site mostra riscado e calcula a % de desconto na hora.
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(40) UNIQUE NOT NULL,   -- sempre em maiúsculas
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
  active           BOOLEAN DEFAULT TRUE,
  valid_until      DATE,                          -- NULL = sem validade
  max_uses         INTEGER,                       -- NULL = ilimitado
  uses             INTEGER DEFAULT 0,             -- só incrementa em pedido pago
  created_at       TIMESTAMP DEFAULT NOW()
);
