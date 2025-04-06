# Auth0 Authentication Troubleshooting Guide

## Current Issues

1. **Admin Dashboard Access**: Fixed through updating Supabase RLS policies.
2. **My Dashboard Login Loop**: When accessing the user dashboard, some users experience a login loop where they're redirected to login despite being authenticated.

## Root Causes

The issues are caused by a combination of factors:

1. **Redirect Loop in Layout Component**: The original user dashboard layout contained a direct `router.push()` call outside of an effect hook. In Next.js client components, this creates an infinite loop as the push triggers a re-render during the component render phase.

2. **Missing ReturnTo Parameter**: When redirecting to login, not specifying where to return causes issues after successful login.

3. **Auth0 Session Verification**: There could be issues with the Auth0 session verification where the cookie-based session isn't being properly recognized.

## Solutions Implemented

### 1. Fixed User Dashboard Layout

Modified `src/app/user-dashboard/layout.tsx` to:
- Move the redirect logic into a `useEffect` hook
- Add a small delay to prevent immediate redirects that can cause loops
- Add a `returnTo` parameter to the login URL
- Improve error and loading states with better UI feedback

### 2. Added Authentication Debugging Tools

Created an `/auth-debug` page to:
- Show current authentication status
- Test API endpoints for token retrieval
- Display detailed error information
- Provide links to other authentication debug tools

## How to Test

1. **Basic Authentication Test**:
   - Visit `/auth-debug` to see your current auth status
   - Log out completely and log back in
   - Check if you remain logged in across page refreshes

2. **Dashboard Access Test**:
   - After logging in, try accessing `/user-dashboard`
   - If you're redirected to login, use the debug page to check your auth status
   - Check browser console for any authentication errors

## Common Issues & Fixes

### If you're still experiencing redirect loops:

1. **Clear Browser Data**:
   - Clear cookies, localStorage, and browser cache
   - Completely close your browser and reopen

2. **Check Auth0 Configuration**:
   - Verify your Auth0 tenant settings match your application
   - Ensure the callback URL is correctly configured
   - Check that your application domain is in the allowed list

3. **Check Environment Variables**:
   - Ensure all Auth0-related environment variables are correct
   - Make sure `AUTH0_SECRET` is properly set
   - Verify `AUTH0_BASE_URL` matches your deployment URL

4. **Inspect Network Requests**:
   - Use browser DevTools to examine the network traffic
   - Look for failed or redirected authentication requests
   - Check for CORS or other security-related errors

### If you're authenticated but can't access your profile:

1. **Database Permission Issue**:
   - Run the SQL from `fix_user_access.sql` to update RLS policies
   - Verify that the `auth.user_id()` function works correctly
   - Check that your Supabase JWT contains the correct user ID

2. **JWT Format Issue**:
   - Visit `/debug` to inspect your JWT token
   - Verify the token contains the expected `userId` claim
   - Check that the JWT hasn't expired

## How the Auth Flow Works

1. User clicks "Login" and is redirected to Auth0
2. Auth0 authenticates the user and redirects back to the callback URL
3. The callback handler in `pages/api/auth/[...auth0].js` processes the authentication:
   - Generates a Supabase JWT token with the user's Auth0 ID
   - Records the login event
   - Syncs the user profile information
4. The Auth0 session is stored in an HTTP-only cookie
5. The `useUser()` hook from `@auth0/nextjs-auth0/client` retrieves the session
6. Protected routes check the session and redirect if not authenticated

## Additional Debugging Tools

- `/test-auth`: Simple page to test Auth0 authentication
- `/debug`: Detailed token information
- `/auth-debug`: Quick authentication status checker
- `/api/debug-token`: API endpoint to see session details 