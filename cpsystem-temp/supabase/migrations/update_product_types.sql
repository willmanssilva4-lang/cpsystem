-- SCRIPT DE CORREÇÃO DE SCHEMA - update_product_types.sql
-- Adiciona colunas para controle de tipos de produtos, produtos base e novos modos de precificação

DO $$ 
BEGIN
    -- 1. Coluna para o Tipo de Produto (BASE, SALE, KIT)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'product_type') THEN
        ALTER TABLE public.products ADD COLUMN product_type TEXT DEFAULT 'SALE';
    END IF;

    -- 2. Coluna para o ID do Produto Base (Casas Decimais/Frações)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'base_product_id') THEN
        ALTER TABLE public.products ADD COLUMN base_product_id UUID REFERENCES public.products(id);
    END IF;

    -- 3. Coluna para o Fator de Conversão
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'conversion_factor') THEN
        ALTER TABLE public.products ADD COLUMN conversion_factor NUMERIC DEFAULT 1;
    END IF;

    -- 4. Coluna para Quantidade Mínima de Atacado (Acabamos de adicionar, mas garantindo aqui)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'wholesale_min_qty') THEN
        ALTER TABLE public.products ADD COLUMN wholesale_min_qty NUMERIC DEFAULT 0;
    END IF;

    -- 5. Outras colunas de preço que podem estar faltando em ambientes antigos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'wholesale_price') THEN
        ALTER TABLE public.products ADD COLUMN wholesale_price DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'term_price') THEN
        ALTER TABLE public.products ADD COLUMN term_price DECIMAL(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'club_price') THEN
        ALTER TABLE public.products ADD COLUMN club_price DECIMAL(12,2) DEFAULT 0;
    END IF;

END $$;
