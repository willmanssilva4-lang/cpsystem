import { supabase } from './lib/supabase.ts';

async function main() {
  const nowStr = new Date().toISOString();
  
  console.log('Testing anon insert/upsert of last_carga_at...');
  const payload = {
    setting_key: 'last_carga_at',
    setting_value: nowStr,
    company_id: null // Or omit if not needed
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('system_settings')
    .upsert([payload])
    .select();
    
  console.log('Anon Upsert Result:', insertData);
  console.log('Anon Upsert Error:', insertError);

  console.log('Testing anon select of last_carga_at...');
  const { data: selectData, error: selectError } = await supabase
    .from('system_settings')
    .select('setting_value, updated_at')
    .eq('setting_key', 'last_carga_at');
    
  console.log('Anon Select Result:', selectData);
  console.log('Anon Select Error:', selectError);
}

main();
