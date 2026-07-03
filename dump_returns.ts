
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function dumpReturns() {
  const { data, error } = await supabase.from('returns').select('*');
  if (error) {
    console.error('Error fetching returns:', error);
    return;
  }
  fs.writeFileSync('returns_dump.json', JSON.stringify(data, null, 2));
  console.log('Dumped all returns to returns_dump.json');
}
dumpReturns();
