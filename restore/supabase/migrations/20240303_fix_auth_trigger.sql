-- Fix trigger to handle deleted auth users trying to sign up again
-- This allows re-registering an email that already exists in system_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.system_users (id, username, password_hash, profile_id, status)
  VALUES (
    new.id, 
    new.email, 
    '', 
    '00000000-0000-0000-0000-000000000000', -- Default to Admin profile
    'Ativo'
  )
  ON CONFLICT (username) DO UPDATE
  SET 
    id = EXCLUDED.id, -- Re-link the new Auth ID to the existing user record
    status = 'Ativo';
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
