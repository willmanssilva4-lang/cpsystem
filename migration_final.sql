-- Criar tabela de vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  code text NOT NULL,
  initial_value numeric(10,2) NOT NULL,
  current_value numeric(10,2) NOT NULL,
  customer_id uuid,
  sale_id uuid,
  return_id uuid,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões para vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for vouchers" ON public.vouchers;
CREATE POLICY "Enable read access for vouchers" ON public.vouchers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for vouchers" ON public.vouchers;
CREATE POLICY "Enable insert access for vouchers" ON public.vouchers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for vouchers" ON public.vouchers;
CREATE POLICY "Enable update access for vouchers" ON public.vouchers FOR UPDATE USING (true);

-- Adicionar colunas necessárias para devoluções e status
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text DEFAULT 'Concluída';

-- NOTA: Como a API do Supabase tem um cache de schema (Notified schema cache reload), 
-- você pode precisar recarregar o cache no painel do Supabase executando:
NOTIFY pgrst, 'reload schema';
