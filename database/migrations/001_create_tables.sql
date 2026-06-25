-- =============================================
-- Tropia Brechó — Schema inicial
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categorias
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Produtos
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  size        VARCHAR(20),          -- P, M, G, GG, 36, 37...
  gender      VARCHAR(20),          -- feminino, masculino, unissex
  condition   VARCHAR(50),          -- ótimo, bom, regular
  sold        BOOLEAN DEFAULT FALSE,
  images      TEXT[],               -- array de URLs das fotos
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Clientes
CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(200) UNIQUE NOT NULL,
  phone      VARCHAR(20),
  cpf        VARCHAR(14),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Endereços
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  street      VARCHAR(200),
  number      VARCHAR(20),
  complement  VARCHAR(100),
  district    VARCHAR(100),
  city        VARCHAR(100),
  state       CHAR(2),
  zip_code    VARCHAR(9),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Pedidos
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES customers(id),
  address_id      UUID REFERENCES addresses(id),
  total           DECIMAL(10,2) NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  -- pending | paid | shipped | delivered | cancelled
  payment_method  VARCHAR(50),  -- pix, credit_card, debit_card
  payment_id      VARCHAR(200), -- ID do Mercado Pago
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Itens do pedido
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  price      DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Dados iniciais de categorias
INSERT INTO categories (name, slug) VALUES
  ('Feminino',    'feminino'),
  ('Masculino',   'masculino'),
  ('Calçados',    'calcados'),
  ('Acessórios',  'acessorios');
