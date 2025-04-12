-- Fix User Roles RLS & Redefine is_admin() to Query Table

-- 1. Drop policies that depend on is_admin() FIRST
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins can manage all API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles; -- Also drop this admin policy if it uses is_admin()

-- 2. Now drop the potentially problematic is_admin functions using CASCADE
-- CASCADE will also drop dependent objects (like policies), which is fine since we recreate them.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;

-- 3. Modify the RLS policy for user_roles to break the recursion
-- Grant full management access only to the service_role.
CREATE POLICY "Service role can manage all user roles" 
ON public.user_roles 
FOR ALL 
TO service_role -- Grant only to service_role
USING (true)
WITH CHECK (true);

-- Ensure regular users can still view their own role
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Redefine is_admin() to query the user_roles table directly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check the user_roles table for the current user's role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
EXCEPTION
  -- If any error occurs, assume not admin
  WHEN OTHERS THEN 
    RAISE WARNING 'Error checking admin status in user_roles: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function owner is appropriate (e.g., postgres)
-- ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- 5. Recreate admin policies using the new table-querying is_admin()
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
USING (public.is_admin());

CREATE POLICY "Admins can manage all login history" 
ON public.login_history FOR ALL 
USING (public.is_admin());

CREATE POLICY "Admins can manage all API keys" 
ON public.api_keys FOR ALL 
USING (public.is_admin());

-- Recreate the admin policy for user_roles IF admins should be able to manage roles
-- Note: This policy was previously assigned only to service_role to break recursion.
-- Uncomment the following lines ONLY if admins *need* to manage roles via direct table access and you are sure it won't cause recursion.
-- DROP POLICY IF EXISTS "Service role can manage all user roles" ON public.user_roles; 
-- CREATE POLICY "Admins can manage all user roles" 
-- ON public.user_roles FOR ALL 
-- USING (public.is_admin());

-- 6. Verify policies
SELECT policyname, cmd, qual, roles FROM pg_policies WHERE tablename = 'user_roles';
SELECT policyname, cmd, qual, roles FROM pg_policies WHERE tablename = 'api_keys';

DO $$
BEGIN
  RAISE NOTICE 'user_roles policies updated and is_admin() function now queries the table directly.'; 
END $$; 