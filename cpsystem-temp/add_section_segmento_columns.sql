-- Migração para adicionar Segmento e Seção na Árvore Mercadológica

-- Adiciona a coluna 'segmento' à tabela 'departamentos'
ALTER TABLE public.departamentos 
ADD COLUMN IF NOT EXISTS segmento TEXT;

-- Adiciona a coluna 'secao' à tabela 'departamentos'
ALTER TABLE public.departamentos 
ADD COLUMN IF NOT EXISTS secao TEXT;

-- Adiciona a coluna 'section' à tabela 'products' (para consistência com a tradução e uso no app)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS section TEXT;

-- Nota: A coluna 'segmento' já deveria existir ou foi adicionada anteriormente no 'products'.
-- Caso não esteja, aqui vai por precaução:
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS segmento TEXT;
