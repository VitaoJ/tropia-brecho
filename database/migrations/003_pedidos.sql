-- =============================================
-- Pedidos: valores destrinchados, cupom e snapshot das peças
-- =============================================

-- O total sozinho não conta a história: sem guardar subtotal, desconto e frete
-- separados não dá para conferir uma cobrança nem emitir nota depois.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal  DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount  DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping  DECIMAL(10,2) DEFAULT 0;

-- Guarda o cupom usado. O código vai junto porque o cupom pode ser apagado
-- depois, e o pedido antigo precisa continuar explicando o próprio desconto.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id   UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);

-- Nome e tamanho no momento da compra. Se a peça for renomeada ou removida,
-- o histórico do pedido continua legível.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_size VARCHAR(20);

-- Apagar uma peça não pode derrubar o pedido: o item fica com product_id nulo
-- e sobrevive pelo snapshot acima.
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD  CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Apagar um pedido leva os itens junto
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE order_items ADD  CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- O painel lista por data e filtra por status
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- O webhook do Mercado Pago chega mais de uma vez para o mesmo pagamento;
-- o índice deixa a busca por payment_id barata na hora de confirmar.
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders (payment_id);
