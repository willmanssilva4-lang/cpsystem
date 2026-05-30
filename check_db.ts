import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in process.env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const testData = {
    description: 'TEST EXPENSE',
    category: 'Geral',
    amount: 100,
    status: 'Pago',
    due_date: '2026-05-30',
    type: 'Variável'
  };
  const { data, error } = await supabase.from('expenses').insert([testData]).select();
  console.log('Insert result data:', data, 'error:', error);
}
check();
