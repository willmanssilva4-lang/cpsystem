-- SCRIPT DE MIGRAÇÃO CONSOLIDADO - NOVOS CAMPOS DE PRODUTOS
-- Este script adiciona todos os campos recentes: Linha, Sabor, Gramatura, Embalagem, Segmento e Fornecedor.
-- Execute este script no SQL Editor do seu painel Supabase.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS linha TEXT,
ADD COLUMN IF NOT EXISTS sabor TEXT,
ADD COLUMN IF NOT EXISTS gramatura TEXT,
ADD COLUMN IF NOT EXISTS tipo_embalagem TEXT,
ADD COLUMN IF NOT EXISTS segmento TEXT,
ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Comentários para documentação das novas colunas
COMMENT ON COLUMN public.products.linha IS 'Linha do produto (ex: Premium, Econômica)';
COMMENT ON COLUMN public.products.sabor IS 'Sabor do produto (se aplicável)';
COMMENT ON COLUMN public.products.gramatura IS 'Peso ou medida do produto (ex: 500g, 1L)';
COMMENT ON COLUMN public.products.tipo_embalagem IS 'Tipo da embalagem (ex: Pet, Lata, Refill)';
COMMENT ON COLUMN public.products.segmento IS 'Segmento de mercado (ex: Automotivo, Alimentos, Limpeza)';
COMMENT ON COLUMN public.products.supplier IS 'Nome do fornecedor principal do produto';
