-- Create Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    admission_date DATE NOT NULL,
    salary NUMERIC(10, 2),
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Access Profiles Table
CREATE TABLE IF NOT EXISTS public.access_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Users Table
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL,
    store_id TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.access_profiles(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(profile_id, module)
);

-- Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Default Profiles
INSERT INTO public.access_profiles (name, description) VALUES
('Administrador', 'Acesso total ao sistema'),
('Gerente', 'Acesso a relatórios e gestão de equipe'),
('Caixa', 'Acesso apenas ao PDV e fechamento de caixa'),
('Estoquista', 'Acesso a produtos e movimentações de estoque')
ON CONFLICT (name) DO NOTHING;
