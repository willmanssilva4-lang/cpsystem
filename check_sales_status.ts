
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in process.env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('sales').select('id, status, total');
  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }
  console.log('Sales:', data);
}
check();
