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
    id: 'd3b07384-d113-4c9b-a010-86d11f26487e',
    setting_key: 'theme',
    setting_value: 'light'
  };
  
  console.log('Attempting key-value insert with guessed setting_value...');
  const { data: insertData, error: insertError } = await supabase.from('system_settings').insert([payload]).select();
  console.log('Insert Result:', insertData);
  console.log('Insert Error:', insertError);

  if (insertError) {
    console.log('Trying alternative: value column...');
    const payloadAlt = {
      id: 'd3b07384-d113-4c9b-a010-86d11f26487e',
      setting_key: 'theme',
      value: 'light'
    };
    const { data: insertDataAlt, error: insertErrorAlt } = await supabase.from('system_settings').insert([payloadAlt]).select();
    console.log('Insert Alt Result:', insertDataAlt);
    console.log('Insert Alt Error:', insertErrorAlt);
  }
}

main();
