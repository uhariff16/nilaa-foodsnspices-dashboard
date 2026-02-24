-- Add permissions and full_name to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing admins to have full permissions by default
UPDATE public.user_roles 
SET permissions = '{"overview": true, "sales": true, "expenses": true, "procurement": true, "stock": true, "production": true, "customers": true, "simulator": true, "attendance": true}'::jsonb
WHERE role = 'admin';

-- Update existing viewers to have only overview by default (or as they were)
UPDATE public.user_roles 
SET permissions = '{"overview": true, "attendance": false}'::jsonb
WHERE role = 'viewer' AND permissions = '{}'::jsonb;
