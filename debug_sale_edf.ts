
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkSale() {
  const { data, error } = await supabase.from('sales').select('*').eq('id', '#EDF3C3B6');
  if (error) {
    console.error('Error fetching sale:', error);
    return;
  }
  console.log('Sale data:', JSON.stringify(data, null, 2));
}
checkSale();
