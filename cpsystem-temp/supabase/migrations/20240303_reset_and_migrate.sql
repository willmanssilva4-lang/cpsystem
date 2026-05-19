-- ============================================================================
-- SCRIPT DE RESET E MIGRAÇÃO COMPLETA
-- ATENÇÃO: ESTE SCRIPT APAGARÁ TODOS OS DADOS DAS TABELAS EXISTENTES
-- ============================================================================

-- 1. DROPAR TABELAS EXISTENTES (Para corrigir conflitos de schema)
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS losses CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS access_profiles CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS inventories CASCADE;

-- ============================================================================
-- 2. TABELAS DE AUTENTICAÇÃO E USUÁRIOS
-- ============================================================================

-- Tabela de Funcionários
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  admission_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Perfis de Acesso
CREATE TABLE access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Usuários do Sistema
CREATE TABLE system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES access_profiles(id) ON DELETE SET NULL,
  store_id TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Permissões
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES access_profiles(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(profile_id, module)
);

-- Inserir Perfil de Administrador Padrão
INSERT INTO access_profiles (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador', 'Acesso total ao sistema');

-- Inserir Permissões do Administrador
INSERT INTO permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Estoque', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Financeiro', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Vendas', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Relatórios', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Configurações', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Clientes', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Compras', true, true, true, true);

-- Inserir Funcionário Administrador Padrão
INSERT INTO employees (id, full_name, cpf, role, admission_date)
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador do Sistema', '000.000.000-00', 'Administrador', CURRENT_DATE);

-- Inserir Usuário Admin Padrão (Senha: admin)
INSERT INTO system_users (username, password_hash, employee_id, profile_id, status)
VALUES ('admin', '$2b$10$4x6p.HmWkY4oC025G9pgBO6LLc5bp/hgVKz5GUK/lf50GrATWBbBq', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Ativo');


-- ============================================================================
-- 3. TABELAS PRINCIPAIS (CORE)
-- ============================================================================

-- Produtos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  composition JSONB,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Clientes
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'VIP', 'Em Débito')),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Vendas
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Dinheiro', 'Pix', 'Crédito', 'Débito', 'Fiado')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Itens da Venda
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Perdas
CREATE TABLE losses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  total_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Despesas
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pago', 'Pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Movimentações de Estoque
CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTRADA', 'SAÍDA', 'AJUSTE')),
  quantity INTEGER NOT NULL,
  origin TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inventários
CREATE TABLE inventories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  location TEXT NOT NULL,
  items_counted INTEGER NOT NULL,
  divergence_value DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'Em Andamento' CHECK (status IN ('Concluído', 'Em Andamento')),
  type TEXT DEFAULT 'Geral' CHECK (type IN ('Geral', 'Rotativo', 'Categoria')),
  responsible TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- ============================================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Allow all operations for authenticated users on products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on sales" ON sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on sale_items" ON sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on losses" ON losses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on expenses" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on stock_movements" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on inventories" ON inventories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on employees" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on access_profiles" ON access_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on system_users" ON system_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users on permissions" ON permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir acesso anônimo para login
CREATE POLICY "Allow select for anon users on system_users" ON system_users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow select for anon users on employees" ON employees FOR SELECT TO anon USING (true);
CREATE POLICY "Allow select for anon users on access_profiles" ON access_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow select for anon users on permissions" ON permissions FOR SELECT TO anon USING (true);
