-- Final Cleanup Script for user_roles Policies

-- Drop specific problematic/redundant policies identified
DROP POLICY IF EXISTS "Users can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can access all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete all user_roles" ON public.user_roles;

-- Verify remaining policies on user_roles
-- Should only show "Service role can manage all user roles" and "Users can view their own role"
SELECT policyname, cmd, qual, roles FROM pg_policies WHERE tablename = 'user_roles';

DO $$
BEGIN
  RAISE NOTICE 'Cleaned up specific problematic policies on user_roles.'; 
END $$; 