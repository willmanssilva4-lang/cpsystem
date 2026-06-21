import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  console.log('Querying returns for sale id 841dc6d6-67c2-4142-b1bd-4f236e430745...');
  const { data: rets, error } = await supabase
    .from('returns')
    .select('*')
    .eq('sale_id', '841dc6d6-67c2-4142-b1bd-4f236e430745');
    
  console.log('Returns:', rets, 'Error:', error);
  
  console.log('Querying all returns...');
  const { data: allRets } = await supabase
    .from('returns')
    .select('*')
    .order('created_at', { ascending: false });
    
  console.log('All Returns:', allRets);
}
check();
