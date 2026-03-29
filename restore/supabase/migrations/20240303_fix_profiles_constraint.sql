-- 1. Garante que a tabela existe
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Remove duplicatas se existirem (para poder criar a constraint UNIQUE)
DELETE FROM public.access_profiles a USING (
  SELECT min(ctid) as ctid, name
  FROM public.access_profiles 
  GROUP BY name HAVING COUNT(*) > 1
) b
WHERE a.name = b.name 
AND a.ctid <> b.ctid;

-- 3. Adiciona a constraint UNIQUE na coluna name se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'access_profiles_name_key'
    ) THEN
        ALTER TABLE public.access_profiles ADD CONSTRAINT access_profiles_name_key UNIQUE (name);
    END IF;
END
$$;

-- 4. Configura permissões
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.access_profiles;
CREATE POLICY "Allow all" ON public.access_profiles FOR ALL USING (true);

-- 5. Insere ou atualiza os perfis
INSERT INTO public.access_profiles (name, description)
VALUES 
  ('Administrador', 'Acesso total a todas as funcionalidades do sistema.'),
  ('Gerente', 'Acesso gerencial, pode visualizar relatórios e gerenciar equipe.'),
  ('Financeiro', 'Acesso aos módulos financeiros, contas a pagar e receber.'),
  ('Comprador', 'Acesso ao módulo de compras e gestão de fornecedores.'),
  ('Estoquista', 'Acesso ao controle de estoque, entrada e saída de mercadorias.'),
  ('Caixa', 'Acesso ao PDV e abertura/fechamento de caixa.')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;
