import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Let's test updating the user 'testecaixa'
  const updateData = {
    username: 'testecaixa',
    email: 'teste2@teste.com',
    employee_id: null,
    profile_id: 'f8ab109e-2361-4521-9e5e-0f57ea773b50', // Caixa profile ID
    store_id: 'Todas as Lojas',
    status: 'Ativo'
  };

  const { data: updated, error: updateError } = await supabase
    .from('system_users')
    .update(updateData)
    .eq('id', '50d1ed00-c289-4f3f-824c-e92002b135b6')
    .select();

  console.log('--- UPDATE RESULT ---');
  console.log(updated);
  console.log('Update Error:', updateError);
}

test();
