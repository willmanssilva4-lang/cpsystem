
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function dumpSales() {
  const { data, error } = await supabase.from('sales').select('*');
  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }
  fs.writeFileSync('sales_dump.json', JSON.stringify(data, null, 2));
  console.log('Dumped all sales to sales_dump.json');
}
dumpSales();
