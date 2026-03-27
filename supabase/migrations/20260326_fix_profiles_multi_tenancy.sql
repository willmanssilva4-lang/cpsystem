-- ============================================================================
-- MULTI-TENANT FIX FOR PROFILES AND PERMISSIONS - 2026-03-26
-- This script adds company_id to access_profiles and permissions tables
-- and updates RLS policies for better multi-tenancy.
-- ============================================================================

-- 1. ADD company_id TO access_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'access_profiles' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE access_profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- 2. ADD company_id TO permissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'permissions' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE permissions ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END;
$$;

-- 3. UPDATE UNIQUE CONSTRAINTS
-- For access_profiles: name should be unique per company
ALTER TABLE access_profiles DROP CONSTRAINT IF EXISTS access_profiles_name_key;
-- Check if the constraint exists with a different name or if we need to add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'access_profiles_name_company_key'
    ) THEN
        ALTER TABLE access_profiles ADD CONSTRAINT access_profiles_name_company_key UNIQUE (name, company_id);
    END IF;
END;
$$;

-- For permissions: profile_id and module should be unique per company
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_profile_id_module_key;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'permissions_profile_module_company_key'
    ) THEN
        ALTER TABLE permissions ADD CONSTRAINT permissions_profile_module_company_key UNIQUE (profile_id, module, company_id);
    END IF;
END;
$$;

-- 4. UPDATE RLS POLICIES
-- We use the helper functions defined in 20260324_final_setup.sql

-- For access_profiles
ALTER TABLE access_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON access_profiles;
CREATE POLICY "Tenant Isolation" ON access_profiles
FOR ALL TO authenticated
USING (company_id = get_my_company_id() OR is_super_admin())
WITH CHECK (company_id = get_my_company_id() OR is_super_admin());

-- For permissions
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON permissions;
CREATE POLICY "Tenant Isolation" ON permissions
FOR ALL TO authenticated
USING (company_id = get_my_company_id() OR is_super_admin())
WITH CHECK (company_id = get_my_company_id() OR is_super_admin());

-- 5. BACKFILL company_id FOR EXISTING RECORDS (Optional but recommended)
-- If there are records without company_id, we might want to assign them to the first company found
-- or leave them as NULL if they are global templates.
-- For this system, it seems everything should belong to a company.
DO $$
DECLARE
    v_first_company_id UUID;
BEGIN
    SELECT id INTO v_first_company_id FROM companies LIMIT 1;
    
    IF v_first_company_id IS NOT NULL THEN
        UPDATE access_profiles SET company_id = v_first_company_id WHERE company_id IS NULL;
        UPDATE permissions SET company_id = v_first_company_id WHERE company_id IS NULL;
    END IF;
END;
$$;
