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
  console.log('Querying pg_proc for add_company_id_column details...');
  const { data, error } = await supabase.from('pg_proc').select(`
    proname,
    proargnames,
    prosrc
  `).ilike('proname', '%add_company_id%');
  
  if (error) {
    console.error('Error fetching pg_proc details:', error);
  } else {
    console.log('Function definitions:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
