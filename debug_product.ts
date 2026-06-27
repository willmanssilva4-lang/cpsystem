import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function check() {
  const componentIds = [
    'dc24aea8-2470-4497-86d0-331ae532af84', // ENERG SABORES 2L
    '9f2fd2ef-c523-4eaf-8107-c34070a8a06d'  // DOSE VODKA
  ];

  for (const id of componentIds) {
    const { data: prod } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
      
    if (prod) {
      console.log(`\n--- PRODUCT: ${prod.name} ---`);
      console.log(`Product Type: ${prod.product_type}`);
      console.log(`Stock: ${prod.stock}`);
      console.log(`Base Product ID: ${prod.base_product_id}`);
      console.log(`Conversion Factor: ${prod.conversion_factor}`);
      
      if (prod.base_product_id) {
        const { data: baseProd } = await supabase
          .from('products')
          .select('*')
          .eq('id', prod.base_product_id)
          .single();
          
        if (baseProd) {
          console.log(`-> BASE PRODUCT: ${baseProd.name}`);
          console.log(`   Base Stock: ${baseProd.stock}`);
          console.log(`   Base Product Type: ${baseProd.product_type}`);
        } else {
          console.log(`-> BASE PRODUCT ID ${prod.base_product_id} NOT FOUND!`);
        }
      }
    } else {
      console.log(`Product ID ${id} not found`);
    }
  }
}
check();
