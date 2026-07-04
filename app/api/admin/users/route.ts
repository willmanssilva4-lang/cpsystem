import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials (SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 500 }
    );
  }

  // Validate if the key is likely a service role key (simple check)
  // Service role keys usually have 'role': 'service_role' in the JWT payload.
  try {
    const parts = supabaseServiceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.role !== 'service_role') {
        console.error('Invalid Service Role Key: The provided key does not have the "service_role" role. It might be an Anon key.');
        return NextResponse.json(
          { error: 'Invalid Configuration: SUPABASE_SERVICE_ROLE_KEY appears to be an Anon key, not a Service Role key.' },
          { status: 500 }
        );
      }
    }
  } catch (e) {
    console.error('Error validating service key format:', e);
    // Continue anyway, maybe it's a different format?
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const data = await req.json();
    let { username } = data;
    const { 
      password, 
      email: providedEmail, 
      employeeId, 
      profileId, 
      storeId, 
      status, 
      supervisorCode,
      companyId,
      user_metadata 
    } = data;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    username = username.trim();

    // Use provided email or construct from username
    let email = providedEmail;
    if (!email) {
      email = username.trim().toLowerCase();
      if (!email.includes('@')) {
        if (email === 'admin' || email === 'administrador' || email === 'superadmin') {
          email = 'willmanssilva4@gmail.com';
        } else {
          // Sanitize username for email: remove spaces, special chars
          const sanitizedUsername = email.replace(/[^a-z0-9._-]/g, '');
          email = `${sanitizedUsername}@example.com`;
        }
      }
    } else {
      // Validate provided email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Formato de e-mail inválido' }, { status: 400 });
      }
    }

    // Check if username or email already exists in system_users to provide a better error
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('system_users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing user:', checkError);
    }

    if (existingUser) {
      const field = existingUser.username === username ? 'Nome de usuário' : 'E-mail';
      return NextResponse.json(
        { error: `${field} já está em uso.` },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    console.log('Attempting to create user in Supabase Auth:', { email, username });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: username,
        company_id: companyId,
        companyId: companyId,
        name: username,
        ...user_metadata
      }
    });

    if (authError) {
      console.error('Error creating auth user (Supabase Admin):', authError);
      
      // Check for specific "User not allowed" error which might mean signups are disabled 
      // AND the service key is not working as expected, or rate limits.
      if (authError.message === 'User not allowed') {
         return NextResponse.json({ 
           error: 'User not allowed: This usually means "Enable Signups" is OFF in Supabase and the Service Role Key is invalid or not being used correctly. Please check your SUPABASE_SERVICE_ROLE_KEY.' 
         }, { status: 403 });
      }

      // Check if user already exists in Supabase Auth, and if so, synchronize with system_users
      if (authError.message?.toLowerCase().includes('already been registered') || authError.status === 422) {
        console.log('User already registered in Auth. Attempting to synchronize...');
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && listData?.users) {
          const existingAuthUser = listData.users.find(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase()
          );

          if (existingAuthUser) {
            console.log('Found existing Auth user to sync:', existingAuthUser.id);
            try {
              const passwordHash = await bcrypt.hash(password, 10);
              const { error: dbError } = await supabaseAdmin.from('system_users').upsert([{
                id: existingAuthUser.id, // Link to Auth ID
                username: username,
                email: email,
                employee_id: employeeId || null,
                profile_id: profileId || null,
                store_id: storeId || 'Todas as Lojas',
                status: status || 'Ativo',
                company_id: companyId || null,
                password_hash: passwordHash,
                supervisor_code: supervisorCode || null
              }]);

              if (dbError) {
                console.error('Error inserting into system_users during sync:', dbError.message);
                return NextResponse.json({ error: `Database Error during synchronization: ${dbError.message}` }, { status: 500 });
              }

              // Update metadata & password on the existing Auth user to keep them in sync
              await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
                password: password,
                user_metadata: {
                  username: username,
                  company_id: companyId,
                  companyId: companyId,
                  name: username,
                  ...user_metadata
                }
              });

              console.log('Auth user synchronized with system_users successfully');
              return NextResponse.json({ user: existingAuthUser });
            } catch (dbErr: any) {
              console.error('Exception syncing existing user:', dbErr);
              return NextResponse.json({ error: `Database Exception during sync: ${dbErr.message}` }, { status: 500 });
            }
          }
        }
      }

      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    console.log('User created successfully in Supabase Auth:', authData.user?.id);

    // Insert into system_users table
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      
      const { error: dbError } = await supabaseAdmin.from('system_users').upsert([{
        id: authData.user.id, // Link to Auth ID
        username: username,
        email: email,
        employee_id: employeeId || null,
        profile_id: profileId || null,
        store_id: storeId || 'Todas as Lojas',
        status: status || 'Ativo',
        company_id: companyId || null,
        password_hash: passwordHash,
        supervisor_code: supervisorCode || null
      }]);

      if (dbError) {
        console.error('Error inserting into system_users:', (dbError as Error).message);
        // Cleanup: delete auth user if DB insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: `Database Error: ${(dbError as Error).message}` }, { status: 500 });
      }

      console.log('User inserted into system_users successfully');
      
    } catch (dbErr: unknown) {
      console.error('Exception inserting into system_users:', dbErr);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: `Database Exception: ${(dbErr as Error).message}` }, { status: 500 });
    }

    return NextResponse.json({ user: authData.user });
  } catch (error: unknown) {
    console.error('Unexpected error creating user:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
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
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId');

    let query = supabaseAdmin.from('system_users').select('*');
    
    // If we have a specific company, we filter by that company or null (for platform-wide/system global rows if any)
    if (companyId && companyId !== 'null' && companyId !== 'undefined' && companyId !== '') {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching system_users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Unexpected error fetching system_users:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

