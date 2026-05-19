-- Add company_id to access_profiles and permissions
ALTER TABLE access_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Drop unique constraint on name in access_profiles if it exists
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'access_profiles'::regclass AND contype = 'u';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE access_profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add unique constraint on name and company_id
ALTER TABLE access_profiles ADD CONSTRAINT access_profiles_name_company_id_key UNIQUE NULLS NOT DISTINCT (name, company_id);

-- Fix system_users trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Try to get company_id from metadata
  v_company_id := (new.raw_user_meta_data->>'company_id')::UUID;
  
  INSERT INTO public.system_users (id, username, email, password_hash, status, company_id)
  VALUES (
    new.id, 
    new.email,
    new.email,
    '',
    'Ativo',
    v_company_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_id = COALESCE(system_users.company_id, EXCLUDED.company_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
