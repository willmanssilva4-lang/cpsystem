-- Migration: Add wholesale_price to products
-- Description: Adds the wholesale_price column to the products table to support wholesale pricing in the PDV.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2);
