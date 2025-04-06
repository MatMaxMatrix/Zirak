# Admin User Access to MyDashboard Fix

## Problem Description

When logged in as an admin user, the "My Dashboard" tab is not working correctly. This is because the Row Level Security (RLS) policies created for admin access are conflicting with standard user access policies.

### Technical Root Cause

1. When we implemented the admin access fix, we created a policy called "Admins can view all profiles" that uses the `auth.is_admin()` function
2. However, the existing policy "Users can view their own profile" only grants access when `id = auth.user_id()`
3. For admin users, when they try to access their own profile through the normal user dashboard, they're encountering a policy conflict:
   - The admin policy grants them access to ALL profiles but only when going through admin routes
   - The user policy restricts them to only their own profile
   - The way the policies interact in Supabase causes the profile data to not be properly accessible in the user dashboard context

## Solution

We need to modify the RLS policies to ensure admin users can access both:
- All profiles (for admin functionality)
- Their own profile (for user dashboard functionality)

### Fix Steps

1. Open the Supabase SQL Editor for your project
2. Copy and paste the following SQL:

```sql
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
```

3. Click "Run" to execute the SQL
4. Log out and log back in to refresh your Auth0 token

## How This Fix Works

The key change is modifying the "Users can view their own profile" policy to include an additional condition:
- Original: `id = auth.user_id()`
- Modified: `id = auth.user_id() OR auth.is_admin()`

This allows:
- Regular users to see only their own profile
- Admin users to see their own profile AND all profiles (through the admin dashboard)

## Verification

After applying the fix:
1. Log in as an admin user
2. Navigate to "My Dashboard" - it should now properly display your user information
3. Navigate to "Admin Dashboard" - you should still see all users
4. Both dashboards should now work correctly for admin users

## Understanding RLS Policies

In Supabase, Row Level Security (RLS) policies determine what data users can access. Multiple policies can be applied to a table:
- If ANY policy grants access, the user gets access (policies are "OR"ed together)
- Each policy has its own condition for when it applies
- In this case, the admin user needed both policies to work together correctly 