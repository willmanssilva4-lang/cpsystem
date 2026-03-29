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

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { 
      companyName,
      companyDocument,
      adminName,
      adminEmail,
      adminPassword
    } = await req.json();

    const trimmedCompanyName = companyName?.trim();
    const trimmedCompanyDocument = companyDocument?.trim();
    const trimmedAdminName = adminName?.trim();
    const trimmedAdminEmail = adminEmail?.trim();
    const trimmedAdminPassword = adminPassword;

    if (!trimmedCompanyName || !trimmedAdminName || !trimmedAdminEmail || !trimmedAdminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Check if company with same document already exists
    if (trimmedCompanyDocument) {
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('document', trimmedCompanyDocument)
        .maybeSingle();

      if (existingCompany) {
        return NextResponse.json(
          { error: 'Já existe uma empresa cadastrada com este CNPJ/CPF.' },
          { status: 400 }
        );
      }
    }

    // 2. Check if admin email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('system_users')
      .select('id')
      .eq('email', trimmedAdminEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso por outro administrador.' },
        { status: 400 }
      );
    }

    // 3. Create Company
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        name: trimmedCompanyName,
        document: trimmedCompanyDocument,
        status: 'Ativo'
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      if (companyError.code === '23505') {
        return NextResponse.json({ error: 'Já existe uma empresa cadastrada com este CNPJ/CPF.' }, { status: 400 });
      }
      const detailedError = companyError.message || companyError.details || companyError.hint || JSON.stringify(companyError);
      return NextResponse.json({ error: `Erro ao criar empresa: ${detailedError}` }, { status: 500 });
    }

    const companyId = companyData.id;

    // 2. Criar perfil 'Administrador' específico para esta nova empresa
    // Cada empresa deve ter seu próprio perfil Administrador para isolamento total
    console.log(`DEBUG: Creating Administrador profile for company ${companyId}...`);
    const { data: newProfile, error: createProfileError } = await supabaseAdmin
      .from('access_profiles')
      .insert([{ 
        name: 'Administrador', 
        description: 'Acesso total ao sistema',
        company_id: companyId
      }])
      .select()
      .single();

    if (createProfileError) {
      console.error('Error creating admin profile:', createProfileError);
      // Cleanup company
      await supabaseAdmin.from('companies').delete().eq('id', companyId);
      const detailedError = createProfileError.message || createProfileError.details || createProfileError.hint || JSON.stringify(createProfileError);
      return NextResponse.json({ error: `Falha ao criar perfil de Administrador para a empresa: ${detailedError}` }, { status: 500 });
    }
    
    const profileId = newProfile.id;
    console.log('DEBUG: Created Admin Profile ID:', profileId);

    // 3. Create or Get Admin User in Auth
    let userId;
    const { data: listUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listUsersData.users.find(u => u.email === trimmedAdminEmail);

    if (existingAuthUser) {
      userId = existingAuthUser.id;
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedAdminEmail,
        password: trimmedAdminPassword,
        email_confirm: true,
        user_metadata: {
          name: trimmedAdminName,
          company_id: companyId
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        await supabaseAdmin.from('companies').delete().eq('id', companyId);
        return NextResponse.json({ error: `Erro ao criar usuário: ${authError.message}` }, { status: 400 });
      }
      userId = authData.user.id;
    }

    console.log('DEBUG: Created/Retrieved Auth User ID:', userId);

    // 4. Create or Update User in system_users
    const passwordHash = await bcrypt.hash(trimmedAdminPassword, 10);
    const { error: userError } = await supabaseAdmin.from('system_users').upsert([{
      id: userId,
      username: trimmedAdminName,
      email: trimmedAdminEmail,
      company_id: companyId,
      profile_id: profileId,
      status: 'Ativo',
      password_hash: passwordHash
    }]);

    if (userError) {
      console.error('Error creating system user:', userError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from('companies').delete().eq('id', companyId);
      
      let errorMessage = userError.message || userError.details || userError.hint || JSON.stringify(userError);
      try {
        if (userError.message) {
          const parsedError = JSON.parse(userError.message);
          errorMessage = parsedError.message || userError.message;
        }
      } catch (e) {
        // Not JSON
      }
      return NextResponse.json({ error: `Erro ao criar usuário do sistema: ${errorMessage}` }, { status: 500 });
    }

    // 5. Insert default permissions for the new company
    const defaultModules = ['Produtos', 'Vendas', 'Financeiro', 'Estoque', 'Configurações'];
    const permissionsToInsert = defaultModules.map(module => ({
      profile_id: profileId,
      company_id: companyId,
      module,
      can_view: true,
      can_create: true,
      can_edit: true,
      can_delete: true
    }));

    const { error: permError } = await supabaseAdmin.from('permissions').insert(permissionsToInsert);

    if (permError) {
      console.error('Error inserting default permissions:', permError);
      // We might not want to delete everything here, but at least log it
    }

    return NextResponse.json({ 
      success: true, 
      companyId, 
      userId 
    });

  } catch (error: any) {
    console.error('Unexpected error in company creation API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, name, document, status } = await req.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ name, document, status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, company: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing company ID' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

