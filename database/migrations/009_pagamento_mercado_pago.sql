-- Pagamento pelo Mercado Pago.
--
-- `orders.payment_id` já existia. Falta o status próprio do Mercado Pago, que
-- é mais granular que o nosso: um pagamento pode estar "in_process" (em
-- análise) ou "rejected" com motivo, e nada disso cabe em "pending". O nosso
-- status continua mandando na loja; este aqui é para o painel entender por
-- que um pedido não andou.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40);

-- Registro de tudo que o Mercado Pago nos contou, para auditoria — e é o que
-- torna o webhook idempotente.
--
-- O Mercado Pago reenvia a mesma notificação quando não recebe 200 rápido, e
-- manda de novo a cada mudança. Sem trava, o mesmo pagamento baixaria a peça
-- duas vezes e contaria o cupom duas vezes. O índice único em
-- (payment_id, status) faz a segunda chegada virar ON CONFLICT DO NOTHING.
--
-- `raw` guarda a resposta CONSULTADA na API, nunca o corpo da notificação:
-- corpo de webhook é dado de quem bateu na porta, resposta da API é fato.
-- Sem dado de cartão: o Mercado Pago devolve só os 4 últimos dígitos e a
-- bandeira, e é só isso que fica aqui.
CREATE TABLE IF NOT EXISTS payment_events (
  id            BIGSERIAL PRIMARY KEY,
  payment_id    VARCHAR(64) NOT NULL,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  status        VARCHAR(40) NOT NULL,
  status_detail VARCHAR(80),
  amount        NUMERIC(10,2),
  raw           JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_unicos
  ON payment_events (payment_id, status);

CREATE INDEX IF NOT EXISTS payment_events_pedido
  ON payment_events (order_id);
