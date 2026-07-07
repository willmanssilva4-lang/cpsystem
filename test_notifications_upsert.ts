import { supabase } from './lib/supabase.ts';

async function main() {
  const payload = {
    id: 'd3b07384-d113-4c9b-a010-86d11f26487e',
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      sms: false,
      senderEmail: '',
      last_carga_at: new Date().toISOString()
    }
  };
  
  console.log('Attempting upsert with notifications JSON...');
  const { data, error } = await supabase.from('system_settings').upsert([payload]).select();
  console.log('UPSERT RESULT:', data);
  console.log('UPSERT ERROR:', error);
}

main();
