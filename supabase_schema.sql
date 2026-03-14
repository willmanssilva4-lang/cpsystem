-- SCRIPT DE MIGRAÇÃO PARA SUPABASE (POSTGRESQL)
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabelas de Configuração e Acesso
CREATE TABLE IF NOT EXISTS access_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    profile_id UUID REFERENCES access_profiles(id),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cadastros Base
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'un',
    is_composition BOOLEAN DEFAULT FALSE,
    composition_items JSONB DEFAULT '[]',
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT,
    address TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Controle de Caixa (Novo)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES system_users(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_balance DECIMAL(12,2) NOT NULL,
    closing_balance DECIMAL(12,2),
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_withdrawals DECIMAL(12,2) DEFAULT 0,
    total_deposits DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('suprimento', 'sangria', 'venda')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_closing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES cash_sessions(id),
    system_values JSONB NOT NULL, -- { Dinheiro: 100, Pix: 50... }
    informed_values JSONB NOT NULL,
    differences JSONB NOT NULL,
    justification TEXT,
    authorized_by TEXT, -- Nome do supervisor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vendas e Movimentações
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES cash_sessions(id),
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES system_users(id),
    total DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2),
    discount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL, -- Array de itens da venda
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'reversed')),
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES system_users(id),
    maquininha_id UUID REFERENCES maquininhas(id),
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2),
    date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    type TEXT CHECK (type IN ('in', 'out', 'adjustment', 'loss', 'reversal')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS authorization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'cancel_item', 'cancel_sale', 'reverse_sale', 'discount'
    authorized_by UUID REFERENCES system_users(id),
    operator_id UUID REFERENCES system_users(id),
    sale_id UUID REFERENCES sales(id),
    details JSONB, -- { item_id: '...', value: 10.50, reason: '...' }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discount_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    user_name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Dinheiro', 'Pix', 'Crédito', 'Débito', 'Fiado', 'Voucher', 'Outro')),
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_fixed DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Financeiro e Outros
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pago',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maquininhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    taxa_debito DECIMAL(5,2) DEFAULT 0,
    taxa_credito DECIMAL(5,2) DEFAULT 0,
    taxa_credito_parcelado DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Opcional, mas recomendado)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- Crie políticas de acesso conforme sua necessidade no painel do Supabase.
