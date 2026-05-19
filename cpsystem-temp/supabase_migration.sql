-- Migration for Registrations (Cadastros)

-- Add composition column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS composition JSONB DEFAULT '[]'::jsonb;

-- Suppliers (Fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT, -- CNPJ/CPF
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees (Funcionários)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  salary DECIMAL(12,2),
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods (Formas de Pagamento)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments (Sessão/Departamento)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Groups (Grupos)
CREATE TABLE IF NOT EXISTS product_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Subgroups (Subgrupos)
CREATE TABLE IF NOT EXISTS product_subgroups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  group_id UUID REFERENCES product_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Categories (Categorias)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public access for simplicity in this context, adjust as needed)
DROP POLICY IF EXISTS "Public Access" ON suppliers;
CREATE POLICY "Public Access" ON suppliers FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON employees;
CREATE POLICY "Public Access" ON employees FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON payment_methods;
CREATE POLICY "Public Access" ON payment_methods FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON departments;
CREATE POLICY "Public Access" ON departments FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON product_groups;
CREATE POLICY "Public Access" ON product_groups FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON product_subgroups;
CREATE POLICY "Public Access" ON product_subgroups FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON product_categories;
CREATE POLICY "Public Access" ON product_categories FOR ALL USING (true);

-- Fix for existing products policy if needed
DROP POLICY IF EXISTS "Allow all access to products" ON products;
CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true);

-- Insert some initial data
INSERT INTO payment_methods (name) VALUES ('Dinheiro'), ('Pix'), ('Cartão de Crédito'), ('Cartão de Débito'), ('Fiado') ON CONFLICT DO NOTHING;
INSERT INTO product_groups (name) VALUES ('PADRAO') ON CONFLICT DO NOTHING;
INSERT INTO product_categories (name) VALUES ('PADRAO') ON CONFLICT DO NOTHING;

-- Purchasing Module Tables

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Recebido', 'Cancelado'
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Public Access" ON purchase_orders;
CREATE POLICY "Public Access" ON purchase_orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON purchase_order_items;
CREATE POLICY "Public Access" ON purchase_order_items FOR ALL USING (true);

