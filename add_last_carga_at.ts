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
  console.log('Adding column last_carga_at to system_settings...');
  
  // Try add_company_id_column first
  const { data, error } = await supabase.rpc('add_company_id_column', {
    table_name: 'system_settings',
    column_name: 'last_carga_at',
    column_type: 'text'
  });
  
  console.log('RPC add_company_id_column result:', data, 'Error:', error);

  // If that didn't work (or if the parameters are inside an 'args' object), try that format
  if (error) {
    console.log('Trying with args wrapper...');
    const { data: dataV2, error: errorV2 } = await supabase.rpc('add_company_id_column', {
      args: {
        table_name: 'system_settings',
        column_name: 'last_carga_at',
        column_type: 'text'
      }
    });
    console.log('RPC with args result:', dataV2, 'Error:', errorV2);
  }
  
  // Also try add_company_id_column_v2
  console.log('Trying v2 function...');
  const { data: dataV2_2, error: errorV2_2 } = await supabase.rpc('add_company_id_column_v2', {
    args: {
      table_name: 'system_settings',
      column_name: 'last_carga_at',
      column_type: 'text'
    }
  });
  console.log('RPC v2 result:', dataV2_2, 'Error:', errorV2_2);
}

run();
