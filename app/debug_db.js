import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking suppliers...');
  const { data: sups, error: err1 } = await supabase.from('suppliers').select('*').limit(5);
  console.log('Suppliers:', sups);
  
  console.log('\nChecking products...');
  const { data: prods, error: err2 } = await supabase.from('products').select('*').limit(5);
  console.log('Products:', prods?.map(p => ({ id: p.id, name: p.name, company_id: p.company_id })));

  console.log('\nChecking table structure (column names)...');
  const { data: cols, error: err3 } = await supabase.from('products').select('*').limit(1);
  if (cols && cols.length > 0) {
    console.log('Product columns:', Object.keys(cols[0]));
  }
}

check();
