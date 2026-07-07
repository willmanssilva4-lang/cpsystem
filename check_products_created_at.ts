import { supabase } from './lib/supabase.ts';

async function main() {
  const { data, error } = await supabase.from('products').select('id, created_at').limit(1);
  console.log('Result:', data);
  console.log('Error:', error);
}

main();
