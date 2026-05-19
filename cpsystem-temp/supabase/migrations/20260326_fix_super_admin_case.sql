-- ============================================================================
-- FIX SUPER ADMIN CASE SENSITIVITY - 2026-03-26
-- This script ensures that super admin detection is case-insensitive.
-- ============================================================================

-- 1. UPDATE is_super_admin FUNCTION
-- ----------------------------------------------------------------------------
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
    
    -- Hardcoded super admin email (CASE INSENSITIVE)
    RETURN LOWER(v_email) = 'willmanssilva4@gmail.com';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. UPDATE system_users POLICIES
-- ----------------------------------------------------------------------------

-- Drop existing super admin policy
DROP POLICY IF EXISTS "Super admin manage all" ON public.system_users;

-- Re-create with case-insensitive check
CREATE POLICY "Super admin manage all" ON public.system_users
FOR ALL TO authenticated
USING (LOWER(auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com')
WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'willmanssilva4@gmail.com');

-- 3. ENSURE DASHBOARD PERMISSION EXISTS FOR ADMINISTRADOR PROFILE
-- ----------------------------------------------------------------------------

-- Add 'Dashboard' to permissions for any profile named 'Administrador'
DO $$
DECLARE
    v_profile_id UUID;
BEGIN
    FOR v_profile_id IN SELECT id FROM access_profiles WHERE name = 'Administrador'
    LOOP
        -- Check if Dashboard permission already exists
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE profile_id = v_profile_id AND module = 'Dashboard') THEN
            INSERT INTO permissions (profile_id, module, can_view, can_create, can_edit, can_delete)
            VALUES (v_profile_id, 'Dashboard', true, true, true, true);
        END IF;
    END LOOP;
END $$;
