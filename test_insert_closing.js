const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].trim();
      }
    }
  } catch (err) {
    console.error('Error reading .env file:', err);
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Inserting test cash register...');
  const regId = '00000000-0000-0000-0000-000000000001';
  
  // First clean up if any
  await supabase.from('cash_closings').delete().eq('cash_register_id', regId);
  await supabase.from('cash_registers').delete().eq('id', regId);

  const reg_res = await supabase.from('cash_registers').insert([{
    id: regId,
    opening_balance: 100,
    status: 'closed',
    opened_at: new Date().toISOString(),
    closed_at: new Date().toISOString()
  }]);

  if (reg_res.error) {
    console.error('Error inserting register:', reg_res.error);
    return;
  }
  console.log('Register inserted successfully!');

  console.log('Inserting test closing...');
  const closing_res = await supabase.from('cash_closings').insert([{
    cash_register_id: regId,
    total_system: 100,
    total_informed: 100,
    total_difference: 0,
    justification: JSON.stringify({ text: 'test', informedTotals: [] }),
    closed_at: new Date().toISOString()
  }]);

  if (closing_res.error) {
    console.error('FAIL: Error inserting closing:', closing_res.error);
  } else {
    console.log('SUCCESS: Closing inserted successfully!');
  }

  // Cleanup
  await supabase.from('cash_closings').delete().eq('cash_register_id', regId);
  await supabase.from('cash_registers').delete().eq('id', regId);
}

check();
