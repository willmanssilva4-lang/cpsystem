
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
async function run() {
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  const doseVodka = products?.find(p => p.name.toLowerCase().includes('dose vodka'));
  console.log('--- DOSE VODKA DETAILS ---', doseVodka);
  
  const energCabores = products?.find(p => p.name.toLowerCase().includes('energ sabores'));
  console.log('--- ENERG SABORES DETAILS ---', energCabores);
}
run();
