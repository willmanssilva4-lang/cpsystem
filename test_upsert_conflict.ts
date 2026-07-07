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
  const keyName = 'test_conflict_' + Date.now();
  
  console.log('Inserting first setting with key:', keyName);
  const { data: data1, error: error1 } = await supabase.from('system_settings').insert([{
    setting_key: keyName,
    setting_value: 'value1'
  }]).select();
  console.log('Insert 1 result:', data1, 'Error:', error1);

  if (data1 && data1.length > 0) {
    const rowId = data1[0].id;
    console.log('Attempting upsert of SAME setting_key with different value (no ID)...');
    const { data: data2, error: error2 } = await supabase.from('system_settings').upsert([{
      setting_key: keyName,
      setting_value: 'value2'
    }]).select();
    console.log('Upsert (no ID) result:', data2, 'Error:', error2);

    console.log('Attempting upsert of SAME setting_key with different value (with ID)...');
    const { data: data3, error: error3 } = await supabase.from('system_settings').upsert([{
      id: rowId,
      setting_key: keyName,
      setting_value: 'value3'
    }]).select();
    console.log('Upsert (with ID) result:', data3, 'Error:', error3);
    
    // Clean up
    await supabase.from('system_settings').delete().eq('setting_key', keyName);
  }
}

main();
