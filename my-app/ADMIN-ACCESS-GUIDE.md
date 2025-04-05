# Admin Dashboard Access Guide

This guide will help you fix the issue with the admin dashboard not showing user profiles or showing only the admin user profile.

## Problem

The admin dashboard currently detects admin users correctly, but there are issues with displaying all registered users from Supabase. These issues can include:

1. Only seeing the admin user in the list
2. Not seeing any users at all
3. The Row Level Security (RLS) policies in Supabase restricting access

## Solution Overview

1. Update the Auth0 token generation to include admin role claims
2. Implement Supabase SQL functions to detect admin users
3. Add RLS policies that allow admins to view all profiles
4. Add additional debugging tools

## Step 1: Update Token Generation

The `pages/api/auth/token.js` file has been updated to include:
- Setting `role: 'service_role'` for admin users (which bypasses RLS)
- Adding Hasura-specific claims for admin users
- Including Auth0 roles in the token

✅ This change has been implemented in the codebase.

## Step 2: Run SQL in Supabase

You need to run the SQL in `sql/admin_policy_fix.sql` in your Supabase instance:

1. Log into [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Create a new query
5. Paste the contents of `sql/admin_policy_fix.sql`
6. Run the query

This updated SQL will:
- Ensure the `auth.user_id()` function properly reads our token
- Create clearer and more direct admin bypass policies
- Add a temporary "debug" policy to ensure all profiles are visible

## Step 3: Verify with Debug Tools

1. Visit the `/admin/debug` page in your application
2. Click on "Test Server-Side Fetch" button
3. Verify that you can see all user profiles in the "Server Profiles" tab
4. Click on "Test Client-Side Fetch" button 
5. Verify that you can see all user profiles in the "Client Profiles" tab

If the server-side fetch works but client-side doesn't, it confirms there's an issue with the token or RLS policies.

## Step 4: Test the Admin Dashboard

1. Log out of your application
2. Log back in with your admin account
3. Navigate to the admin dashboard
4. The list of users should now be visible

## Troubleshooting

### If Profiles Still Don't Appear:

1. Check your browser console for errors
2. Visit the `/admin/debug` page to see detailed debugging information
3. Confirm that the token includes:
   - `role: "service_role"` 
   - `x-hasura-default-role: "admin"`

### Verify in Supabase:

In the Supabase SQL Editor, run:

```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Add a simple policy that allows all access (TEMPORARY for debugging)
CREATE POLICY "Debug view all profiles" 
ON public.profiles
FOR SELECT 
USING (true);

-- Test the query
SELECT * FROM profiles;
```

If you can see results after adding the "true" policy, then the issue is with the RLS policies.

## How It Works

1. When an admin user logs in, the token includes the `role: 'service_role'` claim
2. In Supabase, the `service_role` is special and bypasses RLS restrictions
3. Our custom policies also check for admin roles as a backup method

## Common Issues and Solutions

1. **Only seeing admin user**: The token might not have the correct `service_role` value or the RLS policies aren't properly checking for admin status

2. **No users appear**: Check for Supabase connection issues or errors in the console

3. **Error messages**: Look for specific error messages in the browser console or API responses

## Additional Security Notes

This approach gives admin users significant privileges in your database. In a production environment, consider:

1. Using more fine-grained permission control instead of full RLS bypass
2. Adding audit logging for admin actions 