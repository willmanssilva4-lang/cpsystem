import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const body = await req.json();
    const { 
      password, 
      email, 
      username, 
      employeeId, 
      profileId, 
      storeId, 
      status, 
      supervisorCode,
      userNumber,
      companyId
    } = body;
    const { id } = await params;

    // 1. Update Supabase Auth user if password or email is provided
    const authUpdateData: { password?: string; email?: string; user_metadata?: Record<string, unknown> } = {};
    if (password) authUpdateData.password = password;
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Formato de e-mail inválido' }, { status: 400 });
      }
      authUpdateData.email = email;
    }
    
    if (username || companyId) {
      authUpdateData.user_metadata = {
        username: username || body.username,
        company_id: companyId || body.companyId || body.company_id || null,
        companyId: companyId || body.companyId || body.company_id || null,
        ...(body.user_metadata || {})
      };
    }

    if (Object.keys(authUpdateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData);
      if (authError) {
        console.error('Error updating auth user in admin route:', authError.message);
        return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 400 });
      }
    }

    // 2. Prepare database update payload for system_users
    const dbUpdateData: any = {};
    if (username !== undefined) dbUpdateData.username = username;
    if (email !== undefined) dbUpdateData.email = email || null;
    if (employeeId !== undefined) dbUpdateData.employee_id = employeeId || null;
    if (profileId !== undefined) dbUpdateData.profile_id = profileId || null;
    if (storeId !== undefined) dbUpdateData.store_id = storeId || null;
    if (status !== undefined) dbUpdateData.status = status;
    if (supervisorCode !== undefined) dbUpdateData.supervisor_code = supervisorCode || null;
    if (userNumber !== undefined) dbUpdateData.user_number = userNumber || null;
    if (companyId !== undefined) dbUpdateData.company_id = companyId || null;

    if (password) {
      dbUpdateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { error: dbError } = await supabaseAdmin
      .from('system_users')
      .update(dbUpdateData)
      .eq('id', id);

    if (dbError) {
      console.error('Error updating system_users table:', dbError.message);
      return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Unexpected error updating user:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { id } = await params;
    
    // 1. Delete from Auth (attempt)
    let authErrorOccurred = false;
    let authErrorMessage = '';
    
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) {
        authErrorOccurred = true;
        authErrorMessage = authError.message || '';
        console.warn(`Auth delete warning/error for user ${id}:`, authErrorMessage);
      }
    } catch (e: any) {
      authErrorOccurred = true;
      authErrorMessage = e.message || 'Error executing auth delete';
      console.warn(`Auth delete exception for user ${id}:`, authErrorMessage);
    }

    // 2. Delete from DB table public.system_users using Admin client (Service Role bypasses RLS)
    const { error: dbError } = await supabaseAdmin
      .from('system_users')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting system_users table record:', dbError.message);
      return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });
    }

    // If auth delete failed with anything other than "not found", we log it but still succeed 
    // because the database record public.system_users has been successfully removed.
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Unexpected error deleting user:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
