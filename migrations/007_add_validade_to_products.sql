-- add_validade_to_products.sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS validade DATE;
