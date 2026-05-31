
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
async function run() {
  const { data } = await supabase.from('products').select('id, name, cost_price, sale_price').limit(3);
  console.log('Products sample:', data);
}
run();
