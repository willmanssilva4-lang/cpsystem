import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Try to read credentials from environment or .env
let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    if (urlMatch) url = urlMatch[1].trim().replace(/['"]/g, '');
    if (keyMatch) key = keyMatch[1].trim().replace(/['"]/g, '');
  } catch (e) {
    console.error('Failed to read .env file:', e);
  }
}

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Adding user_number column to system_users table...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS user_number INTEGER;'
  });
  if (error) {
    console.error('Error running SQL:', error);
  } else {
    console.log('Success!', data);
  }
}

run();
