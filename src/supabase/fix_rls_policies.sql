-- Drop the existing policy that restricts access strictly by UUID
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Create a new, more robust policy that allows users to view their role if either their UUID matches, OR their secure Auth email matches the row entry.
-- This ensures that users invited by Admins before signing up can still retrieve their dashboard permissions.
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  USING (
    auth.uid() = id OR lower(auth.jwt() ->> 'email') = lower(email)
  );
