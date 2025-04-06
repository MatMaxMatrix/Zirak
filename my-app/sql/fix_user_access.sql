-- Fix User Access for Admin Users
-- This SQL script fixes the issue where admin users can't access their own profile in MyDashboard

-- 1. First, let's identify the issue
-- When we added "Admins can view all profiles" with auth.is_admin(), it didn't properly handle
-- the case where admin users need to view their own profile under standard policy

-- 2. Fix the viewing policy for profiles
DO $$
BEGIN
  -- Drop the restrictive user policy that's conflicting
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON public.profiles;
    
    -- Create a more permissive policy that allows users to see their own profiles
    -- But also ensures admins can see their own profile too
    CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT 
    USING (
      id = auth.user_id() OR auth.is_admin()
    );
    
    RAISE NOTICE 'Updated user profile viewing policy';
  END IF;
END $$;

-- 3. Check other relevant policies
DO $$
BEGIN
  -- Make sure admins can update their own profiles too
  IF EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    DROP POLICY "Users can update their own profile" ON public.profiles;
    
    -- Recreate with admin permission
    CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE 
    USING (
      id = auth.user_id() OR auth.is_admin()
    );
    
    RAISE NOTICE 'Updated user profile update policy';
  END IF;
END $$;

-- 4. Grant explicit permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 5. Log the fixed policy status
DO $$
BEGIN
  RAISE NOTICE 'Profile policies have been updated. Admin users should now be able to access their own profiles in MyDashboard.';
END $$; 