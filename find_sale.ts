
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function findSale() {
  const { data, error } = await supabase.from('sales').select('*');
  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }
  const sale = data.find(s => s.id === '#EDF3C3B6' || s.display_id === '#EDF3C3B6');
  if (!sale) {
    console.log('Sale not found. IDs found:', data.slice(0, 5).map(s => s.id));
  } else {
    console.log('Sale found:', JSON.stringify(sale, null, 2));
  }
}
findSale();
