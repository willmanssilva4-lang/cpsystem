-- Insert default access profiles if they don't exist
INSERT INTO public.access_profiles (name, description)
VALUES 
  ('Administrador', 'Acesso total a todas as funcionalidades do sistema.'),
  ('Gerente', 'Acesso gerencial, pode visualizar relatórios e gerenciar equipe.'),
  ('Financeiro', 'Acesso aos módulos financeiros, contas a pagar e receber.'),
  ('Comprador', 'Acesso ao módulo de compras e gestão de fornecedores.'),
  ('Estoquista', 'Acesso ao controle de estoque, entrada e saída de mercadorias.'),
  ('Caixa', 'Acesso ao PDV e abertura/fechamento de caixa.')
ON CONFLICT (name) DO NOTHING;
