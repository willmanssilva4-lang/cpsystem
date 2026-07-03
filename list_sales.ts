
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function listSales() {
  const { data, error } = await supabase.from('sales').select('id, status, total').limit(10);
  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }
  console.log('Sales data:', JSON.stringify(data, null, 2));
}
listSales();
