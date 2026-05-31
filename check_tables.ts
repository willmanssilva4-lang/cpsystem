
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const { count: c1 } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: c2 } = await supabase.from('erp_products').select('*', { count: 'exact', head: true });
  console.log('products:', c1);
  console.log('erp_products:', c2);
}
run();
