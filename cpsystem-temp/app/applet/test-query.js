import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      purchase_order_items (
        id, product_id, quantity, unit_price, total_price
      )
    `)
    .limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
