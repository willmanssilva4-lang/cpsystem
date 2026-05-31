
import { supabase } from './lib/supabase';

async function check() {
  console.log('--- Checking erp_suppliers ---');
  const { data: erp, error: err1 } = await supabase.from('erp_suppliers').select('*');
  console.log('erp_suppliers count:', erp?.length);
  console.log('erp_suppliers sample:', erp?.slice(0, 2));
  if (err1) console.error('Error erp_suppliers:', err1);

  console.log('\n--- Checking suppliers ---');
  const { data: sups, error: err2 } = await supabase.from('suppliers').select('*');
  console.log('suppliers count:', sups?.length);
  console.log('suppliers sample:', sups?.slice(0, 2));
  if (err2) console.error('Error suppliers:', err2);
}

check();
