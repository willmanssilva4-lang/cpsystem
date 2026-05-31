
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
async function run() {
  const { data } = await supabase.from('sales').select('id, total, tax_amount').limit(5);
  console.log('Sales samples:', data);
}
run();
