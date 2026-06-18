import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function searchCustomProducts() {
  const { data: products } = await supabase.from('products').select('*');
  const matched = products?.filter(p => 
    p.name.toLowerCase().includes('avulso') || 
    p.name.toLowerCase().includes('adicional') || 
    p.name.toLowerCase().includes('generico') || 
    p.name.toLowerCase().includes('taxa') || 
    p.name.toLowerCase().includes('outros')
  );
  console.log('Matched Products:', matched?.map(p => ({ id: p.id, name: p.name, price: p.price, sku: p.sku })));
}

searchCustomProducts();
