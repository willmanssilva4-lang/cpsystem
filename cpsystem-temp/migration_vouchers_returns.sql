CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid, -- se aplicável, references companies(id)
  code text NOT NULL,
  initial_value numeric(10,2) NOT NULL,
  current_value numeric(10,2) NOT NULL,
  customer_id uuid,
  sale_id uuid,
  return_id uuid,
  status text NOT NULL DEFAULT 'Ativo',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar permissões à tabela vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Permite leitura de vouchers pela mesma empresa ou nula
CREATE POLICY "Enable read access for all users" ON public.vouchers
  FOR SELECT USING (true);

-- Permite inserção e atualização de vouchers
CREATE POLICY "Enable insert access for all users" ON public.vouchers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.vouchers
  FOR UPDATE USING (true);

-- Adicionar a coluna voucher_code na tabela returns
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS voucher_code text;
