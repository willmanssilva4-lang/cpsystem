import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%DOSE GIN%');
    
  console.log('Product data:', data, 'error:', error);
}
check();
