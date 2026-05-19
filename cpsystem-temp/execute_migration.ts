import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Note: We might need service_role key to execute SQL, but let's try anon key if we don't have service_role

const supabase = createClient(url, key);

async function run() {
  const sql = `
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

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.vouchers;
CREATE POLICY "Enable read access for all users" ON public.vouchers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.vouchers;
CREATE POLICY "Enable insert access for all users" ON public.vouchers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for all users" ON public.vouchers;
CREATE POLICY "Enable update access for all users" ON public.vouchers FOR UPDATE USING (true);

ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text DEFAULT 'Concluída';
  `;

  // We can't use supabase.rpc if the rpc isn't defined.
  // Instead, maybe there's a stored procedure like 'exec_sql'. If not, we have to tell the user to run it.
  console.log("To run this, we need 'exec_sql'.");
}
run();
