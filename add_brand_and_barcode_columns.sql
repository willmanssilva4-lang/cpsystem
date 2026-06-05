-- SCRIPT PARA ADICIONAR COLUNAS DE MARCA E CÓDIGO DE BARRAS
-- Execute este script no SQL Editor do seu banco de dados.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Comentários para documentação das novas colunas
COMMENT ON COLUMN public.products.brand IS 'Marca comercial do produto';
COMMENT ON COLUMN public.products.barcode IS 'Código de barras principal (EAN/UPC)';
