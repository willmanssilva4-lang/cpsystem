import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read from .env.example or .env if it exists
// In this environment, we usually have access to process.env for NEXT_PUBLIC_SUPABASE_URL
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  console.log('Checking promotions table schema...');
  const { data: promoData, error: promoError } = await supabase.from('promotions').select('*').limit(1);
  
  if (promoError) {
    console.error('Error fetching from promotions:', promoError);
  } else if (promoData && promoData.length > 0) {
    console.log('Promotions columns:', Object.keys(promoData[0]));
  }

  console.log('\nChecking system_settings table columns from information_schema...');
  const { data: colsData, error: colsError } = await supabase.rpc('get_table_columns', { table_name: 'system_settings' });
  
  if (colsError) {
    console.log('RPC get_table_columns failed, trying custom select from pg_attribute/information_schema via a postgrest query if possible, or trying to fetch a dummy select to inspect properties...');
    // Since we don't have SQL endpoint, let's try a regular query on system_settings but with some mock insert to see if we get column errors
    const { error: insertError } = await supabase.from('system_settings').insert([{ non_existent_column_abc: 123 }]);
    console.log('Dummy insert error (contains column info):', insertError?.message);
  } else {
    console.log('Columns:', colsData);
  }

  console.log('\nChecking company_settings table schema...');
  const { data: compData, error: compError } = await supabase.from('company_settings').select('*').limit(5);
  if (compError) {
    console.error('Error fetching from company_settings:', compError);
  } else if (compData) {
    console.log('Company settings count:', compData.length);
    if (compData.length > 0) {
      console.log('Company settings columns:', Object.keys(compData[0]));
      console.log('Company settings record:', compData[0]);
    }
  }
}
check();
