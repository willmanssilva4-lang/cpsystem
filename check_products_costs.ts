
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
async function run() {
  const { data: maqs, error: err1 } = await supabase.from('maquininhas').select('*');
  const { data: methods, error: err2 } = await supabase.from('payment_methods').select('*');
  console.log('Maquininhas:', maqs);
  console.log('Payment Methods:', methods);
}
run();
