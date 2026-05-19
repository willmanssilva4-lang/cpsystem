import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL is missing' }, { status: 500 });
  }

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 });
  }

  // Check key format
  let keyType = 'unknown';
  
  if (supabaseServiceKey.startsWith('sb_publishable_')) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Invalid Key Type: You provided a "Publishable" key. We need the "Service Role" secret key (starts with "ey...").',
      keyType: 'publishable_key'
    }, { status: 500 });
  }

  try {
    const parts = supabaseServiceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      keyType = payload.role || 'unknown';
    }
  } catch (e) {
    keyType = 'invalid_format';
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Try to list users (limit 1) to verify admin access
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });

    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Failed to list users with service key', 
        details: error.message,
        keyType 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Service key is valid and has admin access', 
      keyType,
      userCountSample: data.users.length 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Unexpected error during verification', 
      details: error.message 
    }, { status: 500 });
  }
}
