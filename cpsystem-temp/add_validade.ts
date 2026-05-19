import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function addValidadeColumn() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS validade DATE;'
  });
  console.log('Error:', error);
}
addValidadeColumn();
