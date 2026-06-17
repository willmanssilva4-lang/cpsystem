import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying expenses...');
  const { data: exps, error: err } = await supabase.from('expenses').select('*');
  if (err) {
    console.error('Error fetching expenses:', err);
    return;
  }
  console.log(`Found ${exps.length} expenses.`);
  exps.forEach(e => {
    console.log(`ID: ${e.id} | Desc: ${e.description} | Cat: ${e.category} | Amt: ${e.amount} | Status: ${e.status} | Date: ${e.date || e.issue_date} | PaymentDate: ${e.payment_date}`);
  });
}

check();
