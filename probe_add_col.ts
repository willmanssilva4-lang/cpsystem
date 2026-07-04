import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('Probing add_company_id_column...');
  const { data, error } = await supabase.rpc('add_company_id_column', {
    args: { table_name: 'system_users', column_name: 'user_number', column_type: 'integer' }
  });
  console.log('Result:', data, 'Error:', error);
}

run();
