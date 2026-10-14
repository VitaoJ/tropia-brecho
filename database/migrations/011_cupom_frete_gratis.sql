-- Cupom de frete grátis.
--
-- O cupom podia ser só porcentagem de desconto (1 a 90). Agora pode dar frete
-- grátis, com ou sem porcentagem junto. Frete grátis aqui é a mesma regra do
-- frete grátis acima de R$ 150: a loja paga a opção de entrega MAIS BARATA, e
-- quem escolhe uma mais rápida paga só a diferença.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN NOT NULL DEFAULT FALSE;

-- Um cupom só de frete grátis tem 0% de desconto. Mas cupom sem benefício
-- nenhum não existe: ou tem desconto, ou tem frete grátis, ou os dois.
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_percent_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_percent_check
  CHECK (discount_percent BETWEEN 0 AND 90);
ALTER TABLE coupons ADD CONSTRAINT coupons_tem_beneficio
  CHECK (discount_percent > 0 OR free_shipping);
