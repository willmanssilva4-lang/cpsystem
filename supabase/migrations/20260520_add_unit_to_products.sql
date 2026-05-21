-- Adicionar coluna unit na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN';
