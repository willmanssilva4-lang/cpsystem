-- SCRIPT PARA ADICIONAR COLUNA FORNECEDOR NA TABELA DE PRODUTOS
-- Execute este script no SQL Editor do seu painel Supabase.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier TEXT;

COMMENT ON COLUMN public.products.supplier IS 'Nome do fornecedor principal do produto';
