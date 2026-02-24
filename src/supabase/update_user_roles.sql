-- Add permissions and full_name to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- FIX ROLE CONSTRAINT: Drop existing constraint and recreate with 'power_user'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'viewer', 'power_user'));

-- Update existing admins to have full permissions by default
UPDATE public.user_roles 
SET permissions = '{"overview": true, "sales": true, "expenses": true, "procurement": true, "stock": true, "production": true, "customers": true, "simulator": true, "attendance": true}'::jsonb
WHERE role = 'admin';

-- Update existing viewers to have only overview by default (or as they were)
UPDATE public.user_roles 
SET permissions = '{"overview": true, "attendance": false}'::jsonb
WHERE role = 'viewer' AND permissions = '{}'::jsonb;
