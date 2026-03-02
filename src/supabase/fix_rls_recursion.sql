-- 1. Create a function that bypasses RLS to safely check if the current user is an admin.
--    This prevents the dreaded "infinite recursion" error in PostgreSQL policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql 
SECURITY DEFINER   -- Excecutes with privileges of the user who created it (bypassing RLS)
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1 
    FROM public.user_roles 
    WHERE id = auth.uid() AND (role = 'admin' OR email = 'uhariff@gmail.com')
  );
$$;

-- 2. Drop the recursively broken Admin policy
DROP POLICY IF EXISTS "Admins can do everything on roles" ON public.user_roles;

-- 3. Create the new, safe Admin policy using the function
CREATE POLICY "Admins can do everything on roles"
  ON public.user_roles
  FOR ALL
  USING ( public.is_admin() );
  
-- Ensure the other policy we made earlier is still active.
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() = id OR lower(auth.jwt() ->> 'email') = lower(email)
  );
