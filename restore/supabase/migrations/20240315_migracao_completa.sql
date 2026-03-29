-- ============================================================================
-- MASTER MIGRATION - CONSOLIDATED SCHEMA 2024-03-15
-- This script ensures all tables used in the application are created and configured.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AUTH & ACCESS CONTROL
-- ----------------------------------------------------------------------------

-- Access Profiles
CREATE TABLE IF NOT EXISTS access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  admission_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- System Users
CREATE TABLE IF NOT EXISTS system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES access_profiles(id) ON DELETE SET NULL,
  store_id TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES access_profiles(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(profile_id, module)
);

-- 2. CORE DATA
-- ----------------------------------------------------------------------------

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Categorias
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Subcategorias
CREATE TABLE IF NOT EXISTS subcategorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category TEXT, -- Legacy column
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  subcategoria_id UUID REFERENCES subcategorias(id) ON DELETE SET NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  sale_price DECIMAL(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  composition JSONB,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Produto Lotes
CREATE TABLE IF NOT EXISTS produto_lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  lote_number TEXT NOT NULL,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'VIP', 'Em Débito')),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. SALES & FINANCE
-- ----------------------------------------------------------------------------

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'Dinheiro', 'Pix', 'Crédito', 'Débito', 'Fiado'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Maquininhas
CREATE TABLE IF NOT EXISTS maquininhas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  tax_debit DECIMAL(5,2),
  tax_credit_1x DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Cash Registers (Caixas)
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Closed' CHECK (status IN ('Open', 'Closed', 'Suspended', 'Blocked')),
  current_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Cash Sessions (Aberturas de Caixa)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID REFERENCES cash_registers(id),
  user_id UUID REFERENCES system_users(id),
  opening_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closing_time TIMESTAMP WITH TIME ZONE,
  opening_balance DECIMAL(12, 2) NOT NULL,
  closing_balance DECIMAL(12, 2),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  cash_session_id UUID REFERENCES cash_sessions(id),
  total DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled', 'Pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  promotion_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Losses (Quebras)
CREATE TABLE IF NOT EXISTS losses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  total_value DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pago', 'Pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. INVENTORY & STOCK
-- ----------------------------------------------------------------------------

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAÍDA', 'AJUSTE')),
  quantity INTEGER NOT NULL,
  origin TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Inventories
CREATE TABLE IF NOT EXISTS inventories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  location TEXT NOT NULL,
  items_counted INTEGER NOT NULL,
  divergence_value DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'Em Andamento' CHECK (status IN ('Concluído', 'Em Andamento')),
  type TEXT DEFAULT 'Geral' CHECK (type IN ('Geral', 'Rotativo', 'Categoria')),
  responsible TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. PROMOTIONS & QUOTATIONS
-- ----------------------------------------------------------------------------

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PRICE', 'PERCENTAGE', 'BUY_X_GET_Y', 'COMBO')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  target_type TEXT NOT NULL CHECK (target_type IN ('PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'ALL')),
  target_id TEXT,
  discount_value DECIMAL(12, 2),
  buy_quantity INTEGER,
  pay_quantity INTEGER,
  combo_items JSONB,
  combo_price DECIMAL(12, 2),
  apply_automatically BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em Aberto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LOGS & AUDIT
-- ----------------------------------------------------------------------------

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES system_users(id),
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Discount Logs
CREATE TABLE IF NOT EXISTS discount_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  discount_amount DECIMAL(12, 2) NOT NULL,
  reason TEXT,
  authorized_by UUID REFERENCES system_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. SECURITY & POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Create generic "Allow all for authenticated" policies for development
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- Allow anonymous select on auth-related tables for login
CREATE POLICY "Allow anon select on system_users" ON system_users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon select on access_profiles" ON access_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon select on permissions" ON permissions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon select on employees" ON employees FOR SELECT TO anon USING (true);

-- 8. INITIAL DATA
-- ----------------------------------------------------------------------------

-- Default Admin Profile
INSERT INTO access_profiles (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador', 'Acesso total ao sistema')
ON CONFLICT (name) DO NOTHING;

-- Default Admin Employee
INSERT INTO employees (id, full_name, cpf, role, admission_date)
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador do Sistema', '000.000.000-00', 'Administrador', CURRENT_DATE)
ON CONFLICT (cpf) DO NOTHING;

-- Default Admin User (admin / admin123)
-- Hash for 'admin123'
INSERT INTO system_users (username, password_hash, employee_id, profile_id, status)
VALUES ('admin', '$2b$10$4x6p.HmWkY4oC025G9pgBO6LLc5bp/hgVKz5GUK/lf50GrATWBbBq', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Ativo')
ON CONFLICT (username) DO NOTHING;
