import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  console.log('Checking sale 841dc6d6-67c2-4142-b1bd-4f236e430745...');
  const { data: sale } = await supabase
    .from('sales')
    .select('*')
    .eq('id', '841dc6d6-67c2-4142-b1bd-4f236e430745')
    .single();
    
  console.log('Sale total in DB:', sale?.total, '| subtotal:', sale?.subtotal);
  console.log('Payments array in sale:', sale?.payments);
  
  const { data: items } = await supabase
    .from('sale_items')
    .select('*, products(name, sku)')
    .eq('sale_id', '841dc6d6-67c2-4142-b1bd-4f236e430745');
    
  console.log('Items in DB:');
  items?.forEach(si => {
    console.log(`- Item: ${(si.products as any)?.name} | SKU: ${(si.products as any)?.sku} | Qty: ${si.quantity} | Price: ${si.price} | OriginalPrice: ${si.original_price}`);
  });
}
check();
