import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check columns
    const { data: colData, error: colError } = await supabaseAdmin
      .from('system_users')
      .select('*')
      .limit(1);

    const columns = colData && colData.length > 0 ? Object.keys(colData[0]) : 'No data to check columns';

    // Check policies using RPC if possible, or just return the columns for now
    // We can't easily query pg_policies via PostgREST without a function
    
    // Let's also check if the super admin exists
    const { data: adminData } = await supabaseAdmin
      .from('system_users')
      .select('id, username, email, company_id')
      .eq('username', 'admin')
      .maybeSingle();

    return NextResponse.json({ 
      columns,
      adminUser: adminData || 'Not found',
      message: 'If you are seeing infinite recursion, you MUST run the /supabase/migrations/20260324_final_setup.sql script in the Supabase SQL Editor.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
