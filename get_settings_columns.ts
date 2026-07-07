import { supabase } from './lib/supabase.ts';

async function main() {
  const { error } = await supabase.from('system_settings').insert([{ non_existent_column_abc: 123 }]);
  console.log('Error message containing valid columns:', error);
}

main();
