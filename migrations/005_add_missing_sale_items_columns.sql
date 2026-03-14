-- Migration: Add missing columns to sale_items
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
