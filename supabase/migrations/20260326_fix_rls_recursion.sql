-- ============================================================================
-- FIX RLS RECURSION - 2026-03-26
-- This script fixes the "infinite recursion" error in system_users policies
-- by ensuring that policies do not call functions that query the same table
-- without proper security definer context, and by preferring JWT metadata.
-- ============================================================================

-- 1. RE-DEFINE HELPER FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Function to get the current user's company_id safely
CREATE OR REPLACE FUNCTION get_my_company_id() 
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- 1. Try to get from JWT first (fastest, no recursion)
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
    
    -- 2. Fallback to querying the table if not in JWT
    -- Since this is SECURITY DEFINER, it runs as the owner (postgres)
    -- and bypasses RLS, preventing recursion.
    IF v_company_id IS NULL THEN
        SELECT company_id INTO v_company_id FROM public.system_users WHERE id = auth.uid();
    END IF;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if the current user is a super admin safely
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS BOOLEAN AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- 1. Try to get from JWT first
    v_email := auth.jwt() ->> 'email';
    
    -- 2. Fallback to querying the table
    IF v_email IS NULL THEN
        SELECT email INTO v_email FROM public.system_users WHERE id = auth.uid();
    END IF;
    
    -- Hardcoded super admin email
    RETURN v_email = 'willmanssilva4@gmail.com';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. FIX system_users POLICIES
-- ----------------------------------------------------------------------------

-- Drop ALL existing policies on system_users to ensure a clean state
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'system_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_users', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own record (Non-recursive)
CREATE POLICY "User self-read" ON public.system_users
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Policy: Users in the same company can see each other (Non-recursive via JWT)
CREATE POLICY "Company users read" ON public.system_users
FOR SELECT TO authenticated
USING (
    company_id::text = (auth.jwt() -> 'user_metadata' ->> 'company_id')
);

-- Policy: Super Admin can see and manage everyone (Non-recursive via JWT)
CREATE POLICY "Super admin manage all" ON public.system_users
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com');

-- Policy: Users can update their own basic info
CREATE POLICY "User self-update" ON public.system_users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. RE-APPLY TENANT ISOLATION TO OTHER TABLES
-- ----------------------------------------------------------------------------

-- Function to create a safe tenant policy for any table
CREATE OR REPLACE FUNCTION create_safe_tenant_policy(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Drop existing problematic policies
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON %I', p_table_name);
    
    -- Create new safe policy using the helper functions
    EXECUTE format('
        CREATE POLICY "Tenant Isolation" ON %I
        FOR ALL
        TO authenticated
        USING (company_id = get_my_company_id() OR is_super_admin())
        WITH CHECK (company_id = get_my_company_id() OR is_super_admin())
    ', p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables (EXCLUDING system_users)
SELECT create_safe_tenant_policy('employees');
SELECT create_safe_tenant_policy('products');
SELECT create_safe_tenant_policy('customers');
SELECT create_safe_tenant_policy('suppliers');
SELECT create_safe_tenant_policy('sales');
SELECT create_safe_tenant_policy('sale_items');
SELECT create_safe_tenant_policy('purchase_orders');
SELECT create_safe_tenant_policy('purchase_order_items');
SELECT create_safe_tenant_policy('quotations');
SELECT create_safe_tenant_policy('quotation_items');
SELECT create_safe_tenant_policy('quotation_suppliers');
SELECT create_safe_tenant_policy('quotation_responses');
SELECT create_safe_tenant_policy('losses');
SELECT create_safe_tenant_policy('expenses');
SELECT create_safe_tenant_policy('cash_registers');
SELECT create_safe_tenant_policy('cash_transactions');
SELECT create_safe_tenant_policy('departamentos');
SELECT create_safe_tenant_policy('categorias');
SELECT create_safe_tenant_policy('subcategorias');
SELECT create_safe_tenant_policy('promotions');
SELECT create_safe_tenant_policy('produto_lotes');

-- 4. FIX COMPANIES TABLE POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Company read" ON companies;
DROP POLICY IF EXISTS "Super admin manage companies" ON companies;

CREATE POLICY "Company read" ON companies
FOR SELECT TO authenticated
USING (id = get_my_company_id() OR is_super_admin());

CREATE POLICY "Super admin manage companies" ON companies
FOR ALL TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());
