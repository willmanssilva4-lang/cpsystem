-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
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

-- Create access_profiles table
CREATE TABLE IF NOT EXISTS access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create system_users table
CREATE TABLE IF NOT EXISTS system_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES access_profiles(id) ON DELETE SET NULL,
  store_id TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
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

-- Insert default admin profile
INSERT INTO access_profiles (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador', 'Acesso total ao sistema')
ON CONFLICT DO NOTHING;

-- Insert default admin permissions
INSERT INTO permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Estoque', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Financeiro', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Vendas', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Relatórios', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Configurações', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Clientes', true, true, true, true),
  ('00000000-0000-0000-0000-000000000000', 'Compras', true, true, true, true)
ON CONFLICT DO NOTHING;

-- Insert default admin employee
INSERT INTO employees (id, full_name, cpf, role, admission_date)
VALUES ('00000000-0000-0000-0000-000000000000', 'Administrador do Sistema', '000.000.000-00', 'Administrador', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: admin)
INSERT INTO system_users (username, password_hash, employee_id, profile_id, status)
VALUES ('admin', '$2b$10$4x6p.HmWkY4oC025G9pgBO6LLc5bp/hgVKz5GUK/lf50GrATWBbBq', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'Ativo')
ON CONFLICT DO NOTHING;
