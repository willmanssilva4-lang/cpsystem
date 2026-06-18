import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function detailAdicional() {
  const { data: p } = await supabase.from('products').select('*').eq('id', '8546a7da-55fc-4cc8-898b-448f6d3c142e').single();
  console.log('Adicional Detail:', p);
}

detailAdicional();
