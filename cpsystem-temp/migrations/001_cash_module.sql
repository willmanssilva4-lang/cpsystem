-- MIGRAÇÃO 01: MÓDULO DE CAIXA E VENDAS (DETALHAMENTO)
-- Este script adiciona as tabelas necessárias para o fluxo completo de Caixa e itens de Venda.

-- 1. TABELA DE SESSÕES DE CAIXA (Abertura/Fechamento)
-- Se já existir, garantimos que as colunas estão corretas
CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    opening_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closing_time TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2),
    status TEXT DEFAULT 'Aberto', -- 'Aberto', 'Fechado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE TRANSAÇÕES DE CAIXA (Suprimento e Sangria)
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Suprimento', 'Sangria'
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE LOGS DE FECHAMENTO DE CAIXA
-- Armazena a conferência por método de pagamento no fechamento
CREATE TABLE IF NOT EXISTS cash_closing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL,
    system_amount DECIMAL(10,2) NOT NULL,
    informed_amount DECIMAL(10,2) NOT NULL,
    difference DECIMAL(10,2) NOT NULL,
    justification TEXT,
    approved_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE ITENS DA VENDA (Relacionamento 1:N com Sales)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Acesso total para usuários autenticados)
CREATE POLICY "Allow all for authenticated users" ON cash_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON cash_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON cash_closing_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON sale_items FOR ALL TO authenticated USING (true);
