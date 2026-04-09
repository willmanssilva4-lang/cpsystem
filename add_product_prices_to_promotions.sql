-- Migration: Add product_prices to promotions
-- Date: 08/04/2026

ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS product_prices JSONB DEFAULT '{}';

COMMENT ON COLUMN public.promotions.product_prices IS 'Mapeamento de ID do produto para preço promocional específico';
