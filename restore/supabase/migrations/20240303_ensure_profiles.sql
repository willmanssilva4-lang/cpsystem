-- Ensure access_profiles table exists
CREATE TABLE IF NOT EXISTS public.access_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default profiles (ignoring conflicts)
INSERT INTO public.access_profiles (name, description)
VALUES 
  ('Administrador', 'Acesso total a todas as funcionalidades do sistema.'),
  ('Gerente', 'Acesso gerencial, pode visualizar relatórios e gerenciar equipe.'),
  ('Financeiro', 'Acesso aos módulos financeiros, contas a pagar e receber.'),
  ('Comprador', 'Acesso ao módulo de compras e gestão de fornecedores.'),
  ('Estoquista', 'Acesso ao controle de estoque, entrada e saída de mercadorias.'),
  ('Caixa', 'Acesso ao PDV e abertura/fechamento de caixa.')
ON CONFLICT (name) DO NOTHING;
