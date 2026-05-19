-- ============================================================================
-- CONSOLIDATED MULTI-TENANT MIGRATION & SETUP
-- Execute this in the Supabase SQL Editor
-- ============================================================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. ADD company_id TO ALL TABLES
CREATE OR REPLACE FUNCTION add_company_id_column(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = 'company_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE', p_table_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
SELECT add_company_id_column('system_users');

-- Ensure system_users has email column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'system_users' AND column_name = 'email'
    ) THEN
        ALTER TABLE system_users ADD COLUMN email TEXT;
    END IF;
END;
$$;

SELECT add_company_id_column('employees');
SELECT add_company_id_column('products');
SELECT add_company_id_column('customers');
SELECT add_company_id_column('suppliers');
SELECT add_company_id_column('sales');
SELECT add_company_id_column('sale_items');
SELECT add_company_id_column('purchase_orders');
SELECT add_company_id_column('purchase_order_items');
SELECT add_company_id_column('quotations');
SELECT add_company_id_column('quotation_items');
SELECT add_company_id_column('quotation_suppliers');
SELECT add_company_id_column('quotation_responses');
SELECT add_company_id_column('losses');
SELECT add_company_id_column('expenses');
SELECT add_company_id_column('cash_registers');
SELECT add_company_id_column('cash_transactions');
SELECT add_company_id_column('departamentos');
SELECT add_company_id_column('categorias');
SELECT add_company_id_column('subcategorias');
SELECT add_company_id_column('promotions');
SELECT add_company_id_column('produto_lotes');

-- 3. CONFIGURE RLS POLICIES

-- Helper function to get company_id without recursion
-- SECURITY DEFINER bypasses RLS on system_users
CREATE OR REPLACE FUNCTION get_my_company_id() 
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Try to get from JWT first (faster, no recursion)
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
    
    -- Fallback to querying the table if not in JWT
    IF v_company_id IS NULL THEN
        SELECT company_id INTO v_company_id FROM system_users WHERE id = auth.uid();
    END IF;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS BOOLEAN AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Try to get from JWT first
    v_email := auth.jwt() ->> 'email';
    
    IF v_email IS NULL THEN
        SELECT email INTO v_email FROM system_users WHERE id = auth.uid();
    END IF;
    
    RETURN v_email = 'willmanssilva4@gmail.com';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_tenant_policy(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', p_table_name);
    
    -- Create new policy
    EXECUTE format('
        CREATE POLICY "Tenant Isolation" ON %I
        FOR ALL
        TO authenticated
        USING (company_id::text = get_my_company_id()::text OR is_super_admin())
        WITH CHECK (company_id::text = get_my_company_id()::text OR is_super_admin())
    ', p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to all tables
SELECT create_tenant_policy('employees');
SELECT create_tenant_policy('products');
SELECT create_tenant_policy('customers');
SELECT create_tenant_policy('suppliers');
SELECT create_tenant_policy('sales');
SELECT create_tenant_policy('sale_items');
SELECT create_tenant_policy('purchase_orders');
SELECT create_tenant_policy('purchase_order_items');
SELECT create_tenant_policy('quotations');
SELECT create_tenant_policy('quotation_items');
SELECT create_tenant_policy('quotation_suppliers');
SELECT create_tenant_policy('quotation_responses');
SELECT create_tenant_policy('losses');
SELECT create_tenant_policy('expenses');
SELECT create_tenant_policy('cash_registers');
SELECT create_tenant_policy('cash_transactions');
SELECT create_tenant_policy('departamentos');
SELECT create_tenant_policy('categorias');
SELECT create_tenant_policy('subcategorias');
SELECT create_tenant_policy('promotions');
SELECT create_tenant_policy('produto_lotes');

-- Special policy for system_users
-- Drop ALL existing policies on system_users to prevent conflicts
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'system_users' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON system_users', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "User self-read" ON system_users
FOR SELECT TO authenticated
USING (
    id = auth.uid() OR 
    (auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com' OR
    company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id')
);

CREATE POLICY "User self-update" ON system_users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin manage users" ON system_users
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com');

-- Special policy for companies
-- Drop ALL existing policies on companies to prevent conflicts
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'companies' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Company read" ON companies
FOR SELECT TO authenticated
USING (
    id = get_my_company_id() OR is_super_admin()
);

CREATE POLICY "Super admin manage companies" ON companies
FOR ALL TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 4. SEED INITIAL ACCESS PROFILE
DO $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Insert profile if it doesn't exist
    INSERT INTO access_profiles (name, description)
    VALUES ('Administrador', 'Acesso total ao sistema')
    ON CONFLICT (name) DO NOTHING;

    -- Get the profile ID
    SELECT id INTO v_profile_id FROM access_profiles WHERE name = 'Administrador' LIMIT 1;

    -- Insert permissions for the profile
    IF v_profile_id IS NOT NULL THEN
        INSERT INTO permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
        VALUES 
            (v_profile_id, 'Produtos', true, true, true, true),
            (v_profile_id, 'Vendas', true, true, true, true),
            (v_profile_id, 'Financeiro', true, true, true, true),
            (v_profile_id, 'Estoque', true, true, true, true),
            (v_profile_id, 'Configurações', true, true, true, true)
        ON CONFLICT (profile_id, module) DO NOTHING;
    END IF;
END $$;

-- 5. UPDATE AUTH TRIGGER
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Try to get company_id from metadata
  v_company_id := (new.raw_user_meta_data->>'company_id')::UUID;
  
  INSERT INTO public.system_users (id, username, email, full_name, active, company_id)
  VALUES (
    new.id, 
    new.email,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    true,
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, system_users.full_name),
    company_id = COALESCE(system_users.company_id, EXCLUDED.company_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
