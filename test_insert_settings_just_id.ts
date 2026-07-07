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

async function main() {
  const payload = {
    id: 'd3b07384-d113-4c9b-a010-86d11f26487e'
  };
  
  console.log('Attempting insert with only id using service role...');
  const { data: insertData, error: insertError } = await supabase.from('system_settings').insert([payload]).select();
  console.log('Insert Result:', insertData);
  console.log('Insert Error:', insertError);

  if (!insertError) {
    console.log('Selecting * from system_settings to see all columns...');
    const { data: selectData, error: selectError } = await supabase.from('system_settings').select('*');
    console.log('Select Result:', selectData);
    console.log('Select Error:', selectError);
    if (selectData && selectData.length > 0) {
      console.log('ACTUAL COLUMNS IN DATABASE:', Object.keys(selectData[0]));
    }
  }
}

main();
