
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('system_users').select('user_number').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Column user_number exists');
  }
}
check();
