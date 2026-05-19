-- Script para adicionar a coluna composition na tabela products

-- 1. Adiciona a coluna composition do tipo JSONB na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS composition JSONB DEFAULT '[]'::jsonb;

-- 2. Atualiza os produtos existentes para terem um array vazio caso a coluna tenha sido criada como nula
UPDATE products SET composition = '[]'::jsonb WHERE composition IS NULL;

-- 3. Garante que a coluna não seja nula no futuro (opcional, mas recomendado)
-- ALTER TABLE products ALTER COLUMN composition SET NOT NULL;
