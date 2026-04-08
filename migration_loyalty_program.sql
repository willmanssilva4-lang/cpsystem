-- ===============================================================
-- MIGRATION: PROGRAMA DE FIDELIDADE (CLIENTE CLUBE)
-- Data: 08/04/2026
-- ===============================================================

-- 1. Atualizar tabela de PRODUTOS (products)
-- Adiciona o preço especial para membros do clube e outros campos necessários
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS club_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS composition JSONB DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS codigo_mercadologico TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS validade DATE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS control_stock TEXT DEFAULT 'Sim';

-- 2. Atualizar tabela de CLIENTES (customers)
-- Adiciona campos para identificar membros do clube e data de adesão
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_club_member BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS club_join_date TIMESTAMP WITH TIME ZONE;

-- 3. Atualizar tabela de DESPESAS (expenses)
-- Adiciona campos para melhor controle financeiro
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS interest DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'À vista';

-- 4. Atualizar tabela de PROMOÇÕES (promotions)
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS only_for_club_members BOOLEAN DEFAULT false;

-- 5. Garantir que as permissões (RLS) permitam a leitura/escrita desses novos campos
-- (Geralmente o RLS por tabela já cobre as novas colunas, mas é bom garantir que a política 'Enable all access' esteja ativa se necessário)

COMMENT ON COLUMN public.products.club_price IS 'Preço especial para clientes participantes do programa de fidelidade';
COMMENT ON COLUMN public.customers.is_club_member IS 'Indica se o cliente faz parte do programa de fidelidade (Cliente Clube)';
