-- SCRIPT COMPLETO DE ESTRUTURA (SUPABASE/POSTGRESQL)
-- Execute este script no SQL Editor do seu projeto Supabase para criar todas as tabelas necessárias.

-- 1. Tabelas de Configuração e Acesso
CREATE TABLE IF NOT EXISTS public.access_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.access_profiles(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    phone TEXT,
    role TEXT,
    admission_date DATE,
    salary DECIMAL(12,2),
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL,
    store_id TEXT,
    status TEXT DEFAULT 'Ativo',
    supervisor_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Árvore Mercadológica
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nome TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cadastros Base
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0,
    sale_price DECIMAL(12,2) DEFAULT 0,
    stock DECIMAL(12,3) DEFAULT 0,
    min_stock DECIMAL(12,3) DEFAULT 0,
    image TEXT,
    brand TEXT,
    unit TEXT DEFAULT 'un',
    status TEXT DEFAULT 'Ativo',
    composition JSONB DEFAULT '[]',
    subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL,
    codigo_mercadologico TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.produto_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    numero_lote TEXT NOT NULL,
    data_entrada TIMESTAMPTZ DEFAULT NOW(),
    validade DATE,
    custo_unit DECIMAL(12,2) DEFAULT 0,
    quantidade_inicial DECIMAL(12,3) NOT NULL,
    saldo_atual DECIMAL(12,3) NOT NULL,
    fornecedor_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    email TEXT,
    total_spent DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Ativo',
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Controle de Caixa
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT,
    store_id TEXT,
    terminal_id TEXT,
    operator_id UUID REFERENCES public.system_users(id),
    opening_balance DECIMAL(12,2) NOT NULL,
    status TEXT CHECK (status IN ('open', 'closed', 'blocked', 'suspended')) DEFAULT 'open',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.system_users(id),
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('sangria', 'suprimento', 'ajuste')),
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.system_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    total_system DECIMAL(12,2) NOT NULL,
    total_informed DECIMAL(12,2) NOT NULL,
    total_difference DECIMAL(12,2) NOT NULL,
    approved_by UUID REFERENCES public.system_users(id),
    justification TEXT,
    closed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Vendas e Devoluções
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ DEFAULT NOW(),
    total DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2),
    discount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT,
    customer_id UUID REFERENCES public.customers(id),
    user_id UUID REFERENCES public.system_users(id),
    cash_register_id UUID REFERENCES public.cash_registers(id),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity DECIMAL(12,3) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    discount DECIMAL(12,2) DEFAULT 0,
    promotion_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    total DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PARCIAL', 'TOTAL')),
    refund_method TEXT NOT NULL,
    user_id UUID REFERENCES public.system_users(id),
    status TEXT NOT NULL DEFAULT 'CONCLUÍDO' CHECK (status IN ('CONCLUÍDO', 'CANCELADO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity DECIMAL(12,3) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Auditoria e Logs
CREATE TABLE IF NOT EXISTS public.vendas_descontos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    tipo TEXT CHECK (tipo IN ('item', 'sale')),
    percentual DECIMAL(5,2),
    valor DECIMAL(12,2) NOT NULL,
    usuario_aplicou TEXT,
    usuario_autorizou TEXT,
    motivo TEXT,
    data_hora TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.system_users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip TEXT,
    terminal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Outros
CREATE TABLE IF NOT EXISTS public.losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    lote_id UUID REFERENCES public.produto_lotes(id),
    quantity DECIMAL(12,3) NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    total_value DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    category TEXT,
    supplier TEXT,
    amount DECIMAL(12,2) NOT NULL,
    issue_date DATE,
    due_date DATE,
    payment_date DATE,
    payment_method TEXT,
    financial_account TEXT,
    observation TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency TEXT,
    status TEXT DEFAULT 'Pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id),
    lote_id UUID REFERENCES public.produto_lotes(id),
    type TEXT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    origin TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.system_users(id),
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de Acesso (Exemplo: Acesso total para usuários autenticados)
-- Para produção, você deve restringir estas políticas conforme a necessidade.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Enable all access for all users" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
