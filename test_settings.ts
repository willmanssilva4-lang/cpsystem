import { supabase } from './lib/supabase.ts';

async function main() {
  const { data, error } = await supabase.from('system_settings').select('*');
  console.log('SYSTEM SETTINGS DATA:', data);
  console.log('ERROR:', error);
}

main();
