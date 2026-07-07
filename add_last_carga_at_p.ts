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
  console.log('Adding column last_carga_at to system_settings with p_ prefix...');
  
  // Try with p_ prefix
  const { data, error } = await supabase.rpc('add_company_id_column', {
    p_table_name: 'system_settings',
    p_column_name: 'last_carga_at',
    p_column_type: 'text'
  });
  
  console.log('RPC with p_ prefix result:', data, 'Error:', error);

  // Try v2 with p_ prefix
  const { data: dataV2, error: errorV2 } = await supabase.rpc('add_company_id_column_v2', {
    p_table_name: 'system_settings',
    p_column_name: 'last_carga_at',
    p_column_type: 'text'
  });
  
  console.log('RPC v2 with p_ prefix result:', dataV2, 'Error:', errorV2);
}

run();
