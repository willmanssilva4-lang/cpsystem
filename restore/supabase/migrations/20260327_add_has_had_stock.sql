-- Add has_had_stock column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_had_stock BOOLEAN DEFAULT FALSE;

-- Update existing products that have stock > 0
UPDATE public.products SET has_had_stock = TRUE WHERE stock > 0;

-- Update existing products that have stock movements of type ENTRADA or COMPRA
UPDATE public.products p
SET has_had_stock = TRUE
FROM public.stock_movements sm
WHERE p.id = sm.product_id
AND (sm.type = 'ENTRADA' OR sm.type = 'COMPRA' OR (sm.type = 'AJUSTE' AND sm.quantity > 0));
