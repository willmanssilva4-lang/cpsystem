
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
async function run() {
  const { data } = await supabase.from('sale_items').select('*').limit(1);
  console.log('Sale Items Columns:', Object.keys(data?.[0] || {}));
}
run();
