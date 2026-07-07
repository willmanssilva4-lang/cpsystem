import { supabase } from './lib/supabase.ts';

async function main() {
  const nowStr = new Date().toISOString();
  
  const payload = {
    id: 'd3b07384-d113-4c9b-a010-86d11f26487e',
    theme: 'light',
    logo_url: nowStr,
    company_name: 'CPSystem ERP'
  };
  
  console.log('Attempting upsert of system_settings with logo_url...');
  const { data: upsertData, error: upsertError } = await supabase.from('system_settings').upsert([payload]).select();
  console.log('Upsert result:', upsertData);
  console.log('Upsert error:', upsertError);

  if (!upsertError) {
    console.log('Querying system_settings...');
    const { data: selectData, error: selectError } = await supabase
      .from('system_settings')
      .select('logo_url')
      .eq('id', 'd3b07384-d113-4c9b-a010-86d11f26487e')
      .single();
    
    console.log('Select result:', selectData);
    console.log('Select error:', selectError);
  }
}

main();
