-- MASTER SCHEMA PARA SUPABASE
-- Execute este script para configurar todas as tabelas do ERP

-- Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  total_spent DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  total DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Itens da Venda
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL
);

-- 5. Tabela de Perdas (Quebras)
CREATE TABLE IF NOT EXISTS losses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  total_value DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabela de Despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'Pago',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Segurança)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Allow all access to products" ON products;
DROP POLICY IF EXISTS "Allow all access to customers" ON customers;
DROP POLICY IF EXISTS "Allow all access to sales" ON sales;
DROP POLICY IF EXISTS "Allow all access to sale_items" ON sale_items;
DROP POLICY IF EXISTS "Allow all access to losses" ON losses;
DROP POLICY IF EXISTS "Allow all access to expenses" ON expenses;

-- Criar Políticas de Acesso (Permitir tudo para desenvolvimento)
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access to sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all access to sale_items" ON sale_items FOR ALL USING (true);
CREATE POLICY "Allow all access to losses" ON losses FOR ALL USING (true);
CREATE POLICY "Allow all access to expenses" ON expenses FOR ALL USING (true);
