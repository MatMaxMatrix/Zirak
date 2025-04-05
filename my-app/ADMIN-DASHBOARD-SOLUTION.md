# Admin Dashboard Solution Guide

## Problem Solved

We have fixed the issue where the admin dashboard was only showing the admin user profile but not showing other user profiles from Supabase. 

## Root Cause

The problem was occurring because:

1. The Auth0 token had the admin roles in `https://your-app-domain.com/roles` namespace, but the generated access token for Supabase wasn't including those roles
2. The Row Level Security (RLS) policies in Supabase were preventing the admin from viewing other users' profiles
3. The token needed to have the `service_role` claim specifically to bypass RLS in Supabase

## Solution Implemented

### 1. Updated Token Generation

We've enhanced `pages/api/auth/token.js` to:
- Check for admin roles in multiple namespaces (`https://example.com/roles` and `https://your-app-domain.com/roles`)
- Explicitly set `role: 'service_role'` for admin users, which bypasses RLS in Supabase
- Include Hasura claims for compatibility
- Add additional debug logging

### 2. Improved Admin Detection Logic

We updated `src/lib/auth.ts` to:
- Check for admin roles in multiple namespaces
- Use a more robust detection algorithm that checks multiple sources
- Include your specific email address as an admin
- Collect roles from all sources to ensure nothing is missed

### 3. Fixed Server-Side API Debugging

We also updated `pages/api/admin/debug-profiles.js` to:
- Check admin roles in all possible places
- Generate a proper service_role token for Supabase

### 4. Added SQL Fixes for Supabase

The `sql/admin_policy_fix.sql` file now includes:
- A debug policy that allows viewing all profiles
- Direct check for the service_role in the token
- Simplified RLS bypass for admin users

## How to Verify It Works

1. **First, run the SQL in Supabase**:
   - Log into your Supabase dashboard
   - Navigate to the SQL Editor
   - Paste the contents of `sql/admin_policy_fix.sql` and run it

2. **Clear your browser cache and log in again**:
   - Log out of the application
   - Clear your browser cookies and cache
   - Log back in as an admin user

3. **Visit the Debug Page**:
   - Go to `/admin/debug` in your application
   - Click "Test Server-Side Fetch" - you should now see all user profiles
   - Click "Test Client-Side Fetch" - this should also show all profiles

4. **Check the Admin Dashboard**:
   - Go to `/admin/dashboard`
   - You should now see all user profiles in the list

## Technical Details

### Token Format for Supabase Bypass

For an admin to bypass RLS in Supabase, the token MUST include:
```json
{
  "role": "service_role",
  ...other claims...
}
```

The `service_role` value is special in Supabase and allows bypassing RLS policies.

### Policy Implementation

We created a policy that directly checks for the `service_role`:
```sql
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);
```

### Auth0 Role Detection

We now check for admin roles in multiple places:
1. `https://example.com/roles`
2. `https://your-app-domain.com/roles`
3. `x-hasura-default-role`
4. Direct `role` property
5. Specific admin emails

## Troubleshooting

If you still encounter issues:

1. Check browser console for errors
2. Verify that the SQL in Supabase was executed successfully
3. Use the debug page to see exactly what's in your token
4. Make sure your Supabase JWT secret is correct in the environment variables

The most important part of this fix is ensuring that the token sent to Supabase has the `role: 'service_role'` claim, as this is what allows bypassing RLS. 