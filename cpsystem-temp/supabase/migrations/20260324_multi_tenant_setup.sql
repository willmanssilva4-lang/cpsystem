-- ============================================================================
-- MULTI-TENANT MIGRATION - 2026-03-24
-- This script adds multi-tenant support (company_id) to all relevant tables
-- and configures Row Level Security (RLS) policies.
-- ============================================================================

-- 1. COMPANIES TABLE
-- ----------------------------------------------------------------------------
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
-- ----------------------------------------------------------------------------

-- Function to add company_id column if it doesn't exist
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
-- ----------------------------------------------------------------------------

-- Function to create multi-tenant policy
CREATE OR REPLACE FUNCTION create_tenant_policy(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', p_table_name);
    
    -- Create new policy
    -- This policy assumes that the user's company_id is stored in their system_users record
    -- and that we can access it via a subquery or a custom claim/setting.
    -- For simplicity and performance, we'll use a subquery that checks the system_users table.
    EXECUTE format('
        CREATE POLICY "Tenant Isolation" ON %I
        FOR ALL
        TO authenticated
        USING (
            company_id::text = (
                SELECT company_id::text 
                FROM system_users 
                WHERE id = auth.uid()
            )
        )
        WITH CHECK (
            company_id::text = (
                SELECT company_id::text 
                FROM system_users 
                WHERE id = auth.uid()
            )
        )
    ', p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to all tables
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

-- Special policy for system_users to allow them to read their own record and for admins to see company users
DROP POLICY IF EXISTS "User self-read" ON system_users;
CREATE POLICY "User self-read" ON system_users
FOR SELECT TO authenticated
USING (
    id = auth.uid() OR 
    company_id::text = (
        SELECT company_id::text 
        FROM system_users 
        WHERE id = auth.uid()
    )
);

-- Special policy for companies
-- 1. Allow authenticated users to read their own company info
DROP POLICY IF EXISTS "Company read" ON companies;
CREATE POLICY "Company read" ON companies
FOR SELECT TO authenticated
USING (
    id = (
        SELECT company_id 
        FROM system_users 
        WHERE id = auth.uid()
    ) OR
    (SELECT email FROM system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
);

-- 2. Allow super admin to manage companies
DROP POLICY IF EXISTS "Super admin manage companies" ON companies;
CREATE POLICY "Super admin manage companies" ON companies
FOR ALL TO authenticated
USING (
    (SELECT email FROM system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
)
WITH CHECK (
    (SELECT email FROM system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
);

-- 4. SEED INITIAL COMPANY (Optional)
-- ----------------------------------------------------------------------------
-- INSERT INTO companies (name) VALUES ('Minha Empresa Matriz') ON CONFLICT DO NOTHING;
