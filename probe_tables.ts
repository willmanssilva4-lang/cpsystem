import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Checking sale_items column names ---');
  
  const { data: sales } = await supabase.from('sales').select('id').limit(1);
  const realSaleId = sales?.[0]?.id;
  if (!realSaleId) {
    console.error('No sales found.');
    return;
  }

  // Let's try removing cost_price and unit_price, keep 'price' or 'cost' etc.
  const payload: any = {
    sale_id: realSaleId,
    product_id: '22a4a886-62a8-469a-a187-0d5c77be4c8f',
    quantity: 1,
    price: 10,
    discount: 0,
    promotion_id: null,
    company_id: null
  };

  const { data, error } = await supabase.from('sale_items').insert([payload]).select();
  if (error) {
    console.log('Insert attempt error:', error);
  } else {
    console.log('Successfully inserted!', data);
    // clean up
    await supabase.from('sale_items').delete().eq('id', data[0].id);
  }
}

run();
