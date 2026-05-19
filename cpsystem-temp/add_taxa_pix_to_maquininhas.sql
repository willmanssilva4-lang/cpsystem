-- SCRIPT PARA ADICIONAR COLUNA TAXA PIX NA TABELA DE MAQUININHAS
-- Execute este script no SQL Editor do seu painel Supabase.

ALTER TABLE public.maquininhas 
ADD COLUMN IF NOT EXISTS taxa_pix DECIMAL(5, 2) DEFAULT 0;

COMMENT ON COLUMN public.maquininhas.taxa_pix IS 'Taxa aplicada para pagamentos via PIX nesta maquininha';
