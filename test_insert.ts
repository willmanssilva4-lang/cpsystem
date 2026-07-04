
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Try Service Role
const supabase = createClient(url, key);

async function testInsert() {
  console.log('Testing insert...');
  const { data, error } = await supabase.from('system_users').insert([{
    username: 'testuser_' + Date.now(),
    email: 'test@example.com',
    user_number: 999
  }]);
  
  if (error) {
    console.log('Insert error:', error.message, error.details);
  } else {
    console.log('Insert success');
  }
}
testInsert();
