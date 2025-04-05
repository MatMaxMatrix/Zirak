# Admin Dashboard Access Fix

## Problem
The admin dashboard isn't displaying all users because of restrictive Row Level Security (RLS) policies in Supabase. Currently, you can only see your own admin user profile instead of all user profiles.

## Solution

### Step 1: Apply SQL Fix
1. Open the Supabase dashboard for your project
2. Navigate to the "SQL Editor" section
3. Copy and paste the SQL below:

```sql
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
```

4. Click "Run" to execute the SQL

### Step 2: Refresh Your Session
1. Log out of your application
2. Log back in to refresh your Auth0 token

### Step 3: Verify Fix
1. Go to your admin dashboard page
2. You should now see all user profiles listed
3. If issues persist, try the debug page at `/admin/debug` to test both client and server fetching

## What This Fix Does
1. Creates a proper `auth.is_admin()` function that checks for admin status in multiple ways
2. Sets up RLS policies that allow admins to view all profiles and login history
3. Grants the necessary database permissions to authenticated users and service roles

## Note
If you need to customize who is recognized as an admin, modify the `auth.is_admin()` function in the SQL above to match your specific requirements (e.g., change email addresses or role names). 