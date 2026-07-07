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
  const keyName = 'test_on_conflict_' + Date.now();
  
  console.log('Upserting first with onConflict: setting_key...');
  const { data: d1, error: e1 } = await supabase
    .from('system_settings')
    .upsert([{ setting_key: keyName, setting_value: 'val1' }], { onConflict: 'setting_key' })
    .select();
  console.log('Result 1:', d1, 'Error 1:', e1);

  console.log('Upserting second with onConflict: setting_key...');
  const { data: d2, error: e2 } = await supabase
    .from('system_settings')
    .upsert([{ setting_key: keyName, setting_value: 'val2' }], { onConflict: 'setting_key' })
    .select();
  console.log('Result 2:', d2, 'Error 2:', e2);

  // Clean up
  await supabase.from('system_settings').delete().eq('setting_key', keyName);
}

main();
