-- =============================================
-- TIMESTAMP → TIMESTAMPTZ
-- =============================================
--
-- TIMESTAMP não guarda fuso. O Postgres do Railway roda em UTC e o Node roda
-- no fuso de quem sobe o servidor, então o mesmo instante era lido com três
-- horas de diferença: `reserved_until > NOW()` dizia que a reserva já tinha
-- vencido enquanto o JavaScript dizia que ainda valia.
--
-- Os valores existentes foram todos gravados por NOW() do próprio Postgres,
-- que está em UTC — por isso `AT TIME ZONE 'UTC'` é a leitura correta deles.
-- TIMESTAMPTZ guarda o instante, não o relógio de parede, e os dois lados
-- passam a concordar.

ALTER TABLE products   ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE products   ALTER COLUMN reserved_until TYPE TIMESTAMPTZ USING reserved_until AT TIME ZONE 'UTC';
ALTER TABLE orders     ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE orders     ALTER COLUMN updated_at     TYPE TIMESTAMPTZ USING updated_at     AT TIME ZONE 'UTC';
ALTER TABLE order_items ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE customers  ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE addresses  ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE categories ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE coupons    ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';
ALTER TABLE admins     ALTER COLUMN created_at     TYPE TIMESTAMPTZ USING created_at     AT TIME ZONE 'UTC';

-- coupons.valid_until continua DATE de propósito: é dia de calendário
-- ("vale até 31/12"), não um instante, e não deve mudar com o fuso.
