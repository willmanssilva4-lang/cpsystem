import { supabase } from './lib/supabase.ts';

async function main() {
  const nowStr = new Date().toISOString();
  
  const payload = {
    id: '00000000-0000-0000-0000-000000000000',
    sku: 'CARGA_TIMESTAMP',
    barcode: 'CARGA_TIMESTAMP',
    name: 'PDV_CARGA_TIMESTAMP',
    description: nowStr,
    active: false,
    cost_price: 0,
    sale_price: 0,
    profit: 0,
    profitPercentage: 0,
    min_stock: 0,
    stock: 0,
    category: 'SISTEMA',
    status: 'Inativo'
  };
  
  console.log('Attempting upsert of dummy product in products table...');
  const { data: upsertData, error: upsertError } = await supabase.from('products').upsert([payload]).select();
  console.log('Upsert result:', upsertData);
  console.log('Upsert error:', upsertError);

  if (!upsertError) {
    console.log('Attempting to select the dummy product...');
    const { data: selectData, error: selectError } = await supabase
      .from('products')
      .select('description')
      .eq('sku', 'CARGA_TIMESTAMP')
      .single();
    
    console.log('Select result:', selectData);
    console.log('Select error:', selectError);
  }
}

main();
