
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function checkBelowStock() {
  console.log('--- Checking products below stock ---');
  
  // 1. Total products
  const { count: total, error: err1 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total products:', total);
  if (err1) console.error('Error total:', err1);

  // 2. Sample products
  const { data: samples, error: err2 } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, status, company_id')
    .limit(10);
  
  console.log('Sample products:', JSON.stringify(samples, null, 2));
  if (err2) console.error('Error samples:', err2);

  // 3. Products below stock
  const { data: below, error: err3 } = await supabase
    .from('products')
    .select('id, name, stock, min_stock, status, company_id')
    .filter('stock', 'lte', 'min_stock')
    .filter('status', 'neq', 'Inativo');
  
  console.log('Below stock products found by DB filter:', below?.length || 0);
  if (err3) console.error('Error below DB:', err3);

  // 4. Products below stock calculated manually
  if (samples) {
     const manualBelow = samples.filter(p => p.status !== 'Inativo' && (Number(p.stock) || 0) <= (Number(p.min_stock) || 0));
     console.log('Manual check on samples:', manualBelow.length);
  }
}

checkBelowStock();
