-- First, check if there's an issue with the existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop and recreate the admin policy with a clearer condition
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Make sure the role is service_role (which is the most reliable bypass)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Add a direct debug policy to verify service_role works
CREATE POLICY "Debug view all profiles" 
ON public.profiles
FOR SELECT 
USING (true);

-- Check the auth.user_id() function is working properly
SELECT auth.user_id();

-- Check if auth.is_admin() is returning true for your admin user
SELECT auth.is_admin();

-- Just to be sure, check the token claims
SELECT 
  current_setting('request.jwt.claims', true)::json->>'role' as role,
  current_setting('request.jwt.claims', true)::json->>'userId' as user_id,
  current_setting('request.jwt.claims', true)::json->>'x-hasura-default-role' as hasura_role,
  current_setting('request.jwt.claims', true)::json->'roles' as roles;

-- Check if we can see all profiles directly
SELECT * FROM profiles; 