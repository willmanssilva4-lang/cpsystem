-- Adiciona coluna de email na tabela system_users
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS email TEXT;

-- Atualiza os usuários existentes para ter um email (baseado no username) se estiver vazio
UPDATE public.system_users 
SET email = lower(regexp_replace(username, '[^a-zA-Z0-9._-]', '', 'g')) || '@example.com'
WHERE email IS NULL;
