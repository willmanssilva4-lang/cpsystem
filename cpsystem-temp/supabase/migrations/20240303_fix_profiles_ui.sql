-- Script para garantir perfis de acesso
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.access_profiles;
CREATE POLICY "Allow all" ON public.access_profiles FOR ALL USING (true);

INSERT INTO public.access_profiles (name, description)
VALUES 
  ('Administrador', 'Acesso total a todas as funcionalidades do sistema.'),
  ('Gerente', 'Acesso gerencial, pode visualizar relatórios e gerenciar equipe.'),
  ('Financeiro', 'Acesso aos módulos financeiros, contas a pagar e receber.'),
  ('Comprador', 'Acesso ao módulo de compras e gestão de fornecedores.'),
  ('Estoquista', 'Acesso ao controle de estoque, entrada e saída de mercadorias.'),
  ('Caixa', 'Acesso ao PDV e abertura/fechamento de caixa.')
ON CONFLICT (name) DO NOTHING;
