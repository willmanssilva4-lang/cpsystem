import { supabase } from './lib/supabase.ts';

async function main() {
  const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Keys in audit_logs:', data && data.length > 0 ? Object.keys(data[0]) : 'No rows found');
    console.log('Row content:', data);
  }
}

main();
