import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    if (urlMatch) url = urlMatch[1].trim().replace(/['"]/g, '');
    if (keyMatch) key = keyMatch[1].trim().replace(/['"]/g, '');
  } catch (e) {}
}

const supabase = createClient(url!, key!);

async function check() {
  console.log('Testing select user_number from system_users...');
  const { data, error } = await supabase.from('system_users').select('user_number').limit(1);
  if (error) {
    console.log('Error selecting user_number:', error.message);
  } else {
    console.log('Success! Column exists. Data:', data);
  }
}
check();
