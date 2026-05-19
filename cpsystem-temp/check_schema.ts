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

  console.log('\nChecking sale_items table schema...');
  const { data: saleItemData, error: saleItemError } = await supabase.from('sale_items').select('*').limit(1);
  
  if (saleItemError) {
    console.error('Error fetching from sale_items:', saleItemError);
  } else if (saleItemData && saleItemData.length > 0) {
    console.log('Sale Items columns:', Object.keys(saleItemData[0]));
  } else {
    console.log('No data in sale_items, trying to check for promotion_id column...');
    const { error: testError } = await supabase.from('sale_items').select('promotion_id').limit(1);
    if (testError) {
      console.log('Column "promotion_id" likely missing in sale_items:', testError.message);
    } else {
      console.log('Column "promotion_id" exists in sale_items.');
    }
  }
}
check();
