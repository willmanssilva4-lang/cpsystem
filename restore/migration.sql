-- 1. Criar tabela de Departamentos
CREATE TABLE IF NOT EXISTS public.departamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Criar tabela de Subcategorias
CREATE TABLE IF NOT EXISTS public.subcategorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Atualizar tabela de Produtos (products)
-- Adicionar coluna subcategoria_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subcategoria_id') THEN
        ALTER TABLE public.products ADD COLUMN subcategoria_id UUID REFERENCES public.subcategorias(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Garantir que as colunas category e subgroup existam e tenham valor default para evitar erro de NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        ALTER TABLE public.products ADD COLUMN category TEXT DEFAULT 'PADRAO';
    ELSE
        -- Se já existe, garantir que tenha default para evitar erros futuros
        ALTER TABLE public.products ALTER COLUMN category SET DEFAULT 'PADRAO';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'subgroup') THEN
        ALTER TABLE public.products ADD COLUMN subgroup TEXT DEFAULT 'PADRAO';
    ELSE
         -- Se já existe, garantir que tenha default para evitar erros futuros
        ALTER TABLE public.products ALTER COLUMN subgroup SET DEFAULT 'PADRAO';
    END IF;
END $$;

-- 5. Inserir dados padrão (Opcional - para não começar vazio)
-- Inserir um departamento padrão se não houver nenhum
INSERT INTO public.departamentos (nome)
SELECT 'Geral'
WHERE NOT EXISTS (SELECT 1 FROM public.departamentos);

-- Inserir uma categoria padrão vinculada ao primeiro departamento encontrado
INSERT INTO public.categorias (nome, departamento_id)
SELECT 'Geral', id 
FROM public.departamentos 
WHERE NOT EXISTS (SELECT 1 FROM public.categorias)
LIMIT 1;

-- Inserir uma subcategoria padrão vinculada à primeira categoria encontrada
INSERT INTO public.subcategorias (nome, categoria_id)
SELECT 'Geral', id 
FROM public.categorias 
WHERE NOT EXISTS (SELECT 1 FROM public.subcategorias)
LIMIT 1;

-- 6. Configurar permissões (RLS) - Exemplo básico permitindo tudo (Ajuste conforme necessidade de segurança)
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.departamentos;
CREATE POLICY "Enable all access for all users" ON public.departamentos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.categorias;
CREATE POLICY "Enable all access for all users" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.subcategorias;
CREATE POLICY "Enable all access for all users" ON public.subcategorias FOR ALL USING (true) WITH CHECK (true);
