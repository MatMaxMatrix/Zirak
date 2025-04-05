-- Profile Permissions SQL
-- This script manages all profile-related permissions and access rules

-- 1. First, define the admin check function
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Check for admin email
    current_setting('request.jwt.claims', true)::json->>'email' = 'admin@example.com'
    OR 
    -- Check for service role (used by admin endpoints)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Check for admin in roles array
    EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(
        current_setting('request.jwt.claims', true)::json->'roles'
      ) AS role
      WHERE role = 'admin'
    )
  );
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Clean up profile policies
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles') THEN
    DROP POLICY "Admins can view all profiles" ON public.profiles;
  END IF;

  -- Also clean up login history policies
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'login_history' AND policyname = 'Admins can view all login history') THEN
    DROP POLICY "Admins can view all login history" ON public.login_history;
  END IF;
END $$;

-- 3. Create admin policies for profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.is_admin());

-- 4. Create admin policies for login history
CREATE POLICY "Admins can view all login history"
ON public.login_history
FOR SELECT
USING (auth.is_admin());

-- 5. Grant necessary permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.login_history TO authenticated;
GRANT SELECT ON public.login_history TO service_role; 