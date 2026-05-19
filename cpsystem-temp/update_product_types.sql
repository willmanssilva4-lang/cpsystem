-- Script para adicionar colunas de Tipo de Produto e Controle de Estoque por Conversão
-- Execute este script no SQL Editor do seu painel Supabase

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'SALE' CHECK (product_type IN ('BASE', 'SALE', 'KIT')),
ADD COLUMN IF NOT EXISTS base_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(12,4) DEFAULT 1;

-- Comentário: Estas colunas permitem diferenciar produtos de estoque real (BASE),
-- produtos de venda unitária (SALE) e kits de composição (KIT).
