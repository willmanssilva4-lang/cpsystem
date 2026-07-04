import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing credentials');
  process.exit(1);
}

// Use Service Role Key!
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('Adding user_number column to system_users using Service Role Key...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS user_number INTEGER;'
  });
  if (error) {
    console.error('Error running exec_sql with Service Role Key:', error);
  } else {
    console.log('Success! exec_sql ran with Service Role Key. Data:', data);
  }
}

run();
