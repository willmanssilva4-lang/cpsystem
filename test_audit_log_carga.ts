import { supabase } from './lib/supabase.ts';

async function main() {
  const nowStr = new Date().toISOString();
  
  const logPayload = {
    action: 'carga_enviada',
    details: JSON.stringify({ timestamp: nowStr }),
    user_id: null,
    company_id: null
  };
  
  console.log('Inserting carga_enviada audit log...');
  const { data: insertData, error: insertError } = await supabase.from('audit_logs').insert([logPayload]).select();
  console.log('Insert Result:', insertData);
  console.log('Insert Error:', insertError);

  if (!insertError) {
    console.log('Querying latest carga_enviada audit log...');
    const { data: queryData, error: queryError } = await supabase
      .from('audit_logs')
      .select('details, created_at')
      .eq('action', 'carga_enviada')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('Query Result:', queryData);
    console.log('Query Error:', queryError);
  }
}

main();
