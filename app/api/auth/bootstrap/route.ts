import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'https://placeholder.supabase.co') {
    return NextResponse.json({ error: 'Configuração do servidor incompleta ou usando placeholder' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const superAdminEmail = 'willmanssilva4@gmail.com';
    const defaultPassword = 'admin123'; // Senha temporária

    // 1. Check if user exists in system_users (we will upsert later, so just log or continue)
    const { data: existingUser } = await supabaseAdmin
      .from('system_users')
      .select('id')
      .eq('email', superAdminEmail)
      .maybeSingle();
    
    console.log(existingUser ? 'Super Admin exists, refreshing...' : 'Super Admin not found, creating...');

    // 2. Create or Get Company
    let { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('name', 'Cpsystem Master')
      .maybeSingle();

    if (!company) {
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert([{ name: 'Cpsystem Master', status: 'Ativo' }])
        .select()
        .single();
      
      if (companyError || !newCompany) throw companyError || new Error('Falha ao criar empresa');
      company = newCompany;
    }

    // Ensure company is not null for TypeScript
    const companyId = (company as any).id;

    // 3. Create or Get Profile
    let { data: profile } = await supabaseAdmin
      .from('access_profiles')
      .select('id')
      .eq('name', 'Administrador')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('access_profiles')
        .insert([{ 
          name: 'Administrador', 
          description: 'Acesso total ao sistema',
          company_id: companyId
        }])
        .select()
        .single();
      
      if (profileError || !newProfile) throw profileError || new Error('Falha ao criar perfil');
      profile = newProfile;

      // Insert permissions for the new profile
      const modules = ['Produtos', 'Vendas', 'Financeiro', 'Estoque', 'Configurações'];
      const permissionsData = modules.map(module => ({
        profile_id: profile!.id,
        company_id: companyId,
        module,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true
      }));

      const { error: permError } = await supabaseAdmin
        .from('permissions')
        .insert(permissionsData);
      
      if (permError) console.warn('Erro ao criar permissões:', permError.message);
    }

    // 4. Create or Update User in Auth
    let userId: string | undefined;
    
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listData.users.find(u => u.email === superAdminEmail);

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      // Reset password to ensure it matches our bootstrap default
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Super Admin',
          company_id: companyId
        }
      });
      if (updateError) throw updateError;
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: superAdminEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Super Admin',
          company_id: companyId
        }
      });
      if (authError) throw authError;
      userId = authData.user?.id;
    }

    if (!userId) throw new Error('Falha ao obter ID do usuário');

    // 5. Create or Update in system_users
    const userData: any = {
      id: userId,
      username: 'admin',
      email: superAdminEmail,
      full_name: 'Super Admin',
      profile_id: (profile as any).id,
      active: true,
      company_id: companyId
    };

    let userError;
    const { error: firstTryError } = await supabaseAdmin.from('system_users').upsert([userData]);
    userError = firstTryError;

    if (userError) {
        // If it failed because of company_id column
        if (userError.message.includes('column "company_id" of relation "system_users" does not exist')) {
            delete userData.company_id;
            const { error: retryError } = await supabaseAdmin.from('system_users').upsert([userData]);
            userError = retryError;
            if (userError) throw userError;
            
            return NextResponse.json({ 
              success: true, 
              warning: 'Atenção: A coluna "company_id" não existe na tabela "system_users". O Super Admin foi criado, mas o multi-tenant não funcionará corretamente até que você execute o script de migração /supabase/migrations/20260324_final_setup.sql no editor SQL do Supabase.',
              email: superAdminEmail,
              tempPassword: defaultPassword
            });
        }
    }

    if (userError) throw userError;

    return NextResponse.json({ 
      success: true, 
      message: existingAuthUser ? 'Super Admin atualizado com sucesso!' : 'Super Admin criado com sucesso!',
      email: superAdminEmail,
      tempPassword: defaultPassword
    });

  } catch (error: any) {
    console.error('Bootstrap error:', error);
    const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
