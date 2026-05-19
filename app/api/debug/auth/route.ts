import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const superAdmin = users.find(u => u.email === 'willmanssilva4@gmail.com');

    return NextResponse.json({ 
      exists: !!superAdmin,
      user: superAdmin ? {
        id: superAdmin.id,
        email: superAdmin.email,
        last_sign_in_at: superAdmin.last_sign_in_at,
        user_metadata: superAdmin.user_metadata
      } : null,
      total_users: users.length
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
