-- 006_lotes_and_perdas.sql
-- Migration for Lotes (Batches) and Perdas (Losses) with Batch selection

-- 1. Criar tabela de Lotes (produto_lotes)
CREATE TABLE IF NOT EXISTS public.produto_lotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    numero_lote TEXT NOT NULL,
    data_entrada TIMESTAMPTZ DEFAULT NOW(),
    validade DATE,
    custo_unit DECIMAL(12,2) DEFAULT 0,
    quantidade_inicial DECIMAL(12,2) NOT NULL,
    saldo_atual DECIMAL(12,2) NOT NULL,
    fornecedor_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualizar tabela de Perdas (losses)
-- Adicionar coluna lote_id para vincular a perda a um lote específico
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'losses' AND column_name = 'lote_id') THEN
        ALTER TABLE public.losses ADD COLUMN lote_id UUID REFERENCES public.produto_lotes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar coluna total_value se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'losses' AND column_name = 'total_value') THEN
        ALTER TABLE public.losses ADD COLUMN total_value DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- 3. Atualizar tabela de Movimentações de Estoque (stock_movements)
-- Adicionar colunas para melhor rastreabilidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'origin') THEN
        ALTER TABLE public.stock_movements ADD COLUMN origin TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'user_id') THEN
        ALTER TABLE public.stock_movements ADD COLUMN user_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'user_name') THEN
        ALTER TABLE public.stock_movements ADD COLUMN user_name TEXT;
    END IF;
END $$;

-- Remover restrição de tipo antiga para permitir 'ENTRADA' e 'SAÍDA'
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;

-- 4. Habilitar RLS para a nova tabela
ALTER TABLE public.produto_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.produto_lotes;
CREATE POLICY "Enable all access for all users" ON public.produto_lotes FOR ALL USING (true) WITH CHECK (true);

-- 5. Garantir que a coluna composition existe na tabela de produtos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS composition JSONB DEFAULT '[]'::jsonb;
