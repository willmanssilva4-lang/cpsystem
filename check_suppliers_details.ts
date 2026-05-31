
import { supabase } from './lib/supabase';

async function check() {
  console.log('--- Checking suppliers table structure ---');
  const { data: sups, error } = await supabase.from('suppliers').select('*').limit(5);
  
  if (error) {
    console.error('Error fetching suppliers:', error);
    return;
  }

  console.log('Suppliers count in query:', sups?.length);
  if (sups && sups.length > 0) {
    console.log('Columns found:', Object.keys(sups[0]));
    console.log('Sample data:', JSON.stringify(sups, null, 2));
  } else {
    console.log('No suppliers found in the database.');
  }
}

check();
