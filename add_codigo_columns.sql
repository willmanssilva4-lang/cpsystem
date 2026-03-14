-- Adicionar coluna 'codigo' na tabela departamentos
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Adicionar coluna 'codigo' na tabela categorias
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Adicionar coluna 'codigo' na tabela subcategorias
ALTER TABLE subcategorias ADD COLUMN IF NOT EXISTS codigo TEXT;
