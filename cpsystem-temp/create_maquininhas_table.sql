-- SCRIPT PARA CRIAR A TABELA DE MAQUININHAS
-- Execute este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS public.maquininhas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    taxa_debito DECIMAL(5,2) DEFAULT 0,
    taxa_credito DECIMAL(5,2) DEFAULT 0,
    taxa_credito_parcelado DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.maquininhas ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso (Permitir tudo para simplificar, ajuste conforme necessário)
DROP POLICY IF EXISTS "Enable all access for all users" ON public.maquininhas;
CREATE POLICY "Enable all access for all users" ON public.maquininhas FOR ALL USING (true) WITH CHECK (true);

-- Adicionar coluna maquininha_id na tabela de vendas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'maquininha_id') THEN
        ALTER TABLE public.sales ADD COLUMN maquininha_id UUID REFERENCES public.maquininhas(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'tax_amount') THEN
        ALTER TABLE public.sales ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'net_amount') THEN
        ALTER TABLE public.sales ADD COLUMN net_amount DECIMAL(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'payments') THEN
        ALTER TABLE public.sales ADD COLUMN payments JSONB;
    END IF;
END $$;
