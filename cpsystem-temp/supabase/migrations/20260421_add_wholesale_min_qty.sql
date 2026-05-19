-- Migration to add wholesale minimum quantity to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_min_qty NUMERIC DEFAULT 0;

-- Update existing products to have 0 if needed (it already defaults to 0)
UPDATE products SET wholesale_min_qty = 0 WHERE wholesale_min_qty IS NULL;
