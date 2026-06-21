import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  console.log('Finding all sales with AMENDUPA...');
  const { data: saleItems, error } = await supabase
    .from('sale_items')
    .select('*, sales(*)')
    .eq('product_id', '782447c6-9f48-41e1-bcee-8f8387dc66bf');
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${saleItems?.length} items of AMENDUPA:`);
    saleItems?.forEach(item => {
      console.log(`Sale ID: ${item.sale_id} | Qty: ${item.quantity} | Price: ${item.price} | OriginalPrice: ${item.original_price} | Sale Date: ${item.sales?.date} | Sale Status: ${item.sales?.status}`);
    });
  }
}
check();
