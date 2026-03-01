-- Add granular access control flags to the user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS can_view_dashboard BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT false;

-- For existing records, preserve backwards compatibility:
-- If they are an 'admin', they get everything.
-- If they are a 'viewer' (including legacy power_user mapped in UI), grant dashboard access by default so they aren't locked out immediately.
UPDATE public.user_roles 
SET 
    can_view_dashboard = true,
    can_manage_users = (role = 'admin')
WHERE can_view_dashboard IS FALSE OR can_view_dashboard IS NULL;

-- Notice: can_access_attendance and can_access_payouts were added previously and are retained.

-- CRITICAL FIX: The older database schema restricts the 'role' column to only 'admin' or 'viewer'.
-- We must drop this constraint so the new roles (executive, attendance_manager, etc.) can be inserted.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
