
import { supabase } from './lib/supabase';

async function checkCount() {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error fetching count:', error);
  } else {
    console.log('Total products in database:', count);
  }
}

checkCount();
