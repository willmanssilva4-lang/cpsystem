-- ============================================================================
-- SCHEMA FIXES - 2026-03-27
-- Adds missing columns to products and ensures multi-tenancy for all tables
-- ============================================================================

-- 1. FIX PRODUCTS TABLE COLUMNS
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
        ALTER TABLE public.products ADD COLUMN status TEXT DEFAULT 'Ativo';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'composition') THEN
        ALTER TABLE public.products ADD COLUMN composition JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'codigo_mercadologico') THEN
        ALTER TABLE public.products ADD COLUMN codigo_mercadologico TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'validade') THEN
        ALTER TABLE public.products ADD COLUMN validade DATE;
    END IF;
END $$;

-- 2. ENSURE MULTI-TENANCY (company_id) ON ALL TABLES
-- ----------------------------------------------------------------------------

-- Function to add company_id column if it doesn't exist
CREATE OR REPLACE FUNCTION add_company_id_column_v2(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = 'company_id'
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE', p_table_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that were missed or are new
SELECT add_company_id_column_v2('access_profiles');
SELECT add_company_id_column_v2('permissions');
SELECT add_company_id_column_v2('cash_movements');
SELECT add_company_id_column_v2('cash_closings');
SELECT add_company_id_column_v2('audit_logs');
SELECT add_company_id_column_v2('expense_categories');
SELECT add_company_id_column_v2('maquininhas');
SELECT add_company_id_column_v2('payment_methods');
SELECT add_company_id_column_v2('returns');
SELECT add_company_id_column_v2('return_items');
SELECT add_company_id_column_v2('vendas_descontos');

-- 3. RE-APPLY RLS POLICIES
-- ----------------------------------------------------------------------------

-- Function to create multi-tenant policy
CREATE OR REPLACE FUNCTION create_tenant_policy_v2(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for all users" ON public.%I', p_table_name);
    
    -- Create new policy
    EXECUTE format('
        CREATE POLICY "Tenant Isolation" ON public.%I
        FOR ALL
        TO authenticated
        USING (
            company_id::text = (
                SELECT company_id::text 
                FROM public.system_users 
                WHERE id = auth.uid()
            )
        )
        WITH CHECK (
            company_id::text = (
                SELECT company_id::text 
                FROM public.system_users 
                WHERE id = auth.uid()
            )
        )
    ', p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply policies to all tables
SELECT create_tenant_policy_v2('products');
SELECT create_tenant_policy_v2('customers');
SELECT create_tenant_policy_v2('suppliers');
SELECT create_tenant_policy_v2('sales');
SELECT create_tenant_policy_v2('sale_items');
SELECT create_tenant_policy_v2('losses');
SELECT create_tenant_policy_v2('expenses');
SELECT create_tenant_policy_v2('cash_registers');
SELECT create_tenant_policy_v2('cash_movements');
SELECT create_tenant_policy_v2('cash_closings');
SELECT create_tenant_policy_v2('departamentos');
SELECT create_tenant_policy_v2('categorias');
SELECT create_tenant_policy_v2('subcategorias');
SELECT create_tenant_policy_v2('promotions');
SELECT create_tenant_policy_v2('produto_lotes');
SELECT create_tenant_policy_v2('access_profiles');
SELECT create_tenant_policy_v2('permissions');
SELECT create_tenant_policy_v2('audit_logs');
SELECT create_tenant_policy_v2('expense_categories');
SELECT create_tenant_policy_v2('maquininhas');
SELECT create_tenant_policy_v2('payment_methods');
SELECT create_tenant_policy_v2('returns');
SELECT create_tenant_policy_v2('return_items');
SELECT create_tenant_policy_v2('vendas_descontos');

-- Special policy for system_users
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User self-read" ON public.system_users;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.system_users;
CREATE POLICY "User self-read" ON public.system_users
FOR SELECT TO authenticated
USING (
    id = auth.uid() OR 
    company_id::text = (
        SELECT company_id::text 
        FROM public.system_users 
        WHERE id = auth.uid()
    )
);

-- Special policy for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company read" ON public.companies;
DROP POLICY IF EXISTS "Super admin manage companies" ON public.companies;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.companies;

CREATE POLICY "Company read" ON public.companies
FOR SELECT TO authenticated
USING (
    id = (
        SELECT company_id 
        FROM public.system_users 
        WHERE id = auth.uid()
    ) OR
    (SELECT email FROM public.system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
);

CREATE POLICY "Super admin manage companies" ON public.companies
FOR ALL TO authenticated
USING (
    (SELECT email FROM public.system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
)
WITH CHECK (
    (SELECT email FROM public.system_users WHERE id = auth.uid()) = 'willmanssilva4@gmail.com'
);
