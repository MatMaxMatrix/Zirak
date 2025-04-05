# Auth0 Admin Token Verification Steps

Follow these steps to verify that your Auth0 admin tokens are working correctly:

## Step 1: Update Your Auth0 Action

1. In your Auth0 dashboard, go to **Actions** > **Flows** > **Login**
2. Edit your "Add User Roles" action (or create a new one if needed)
3. **Important**: Update the namespace in your action code:
   ```javascript
   // Change this line in your action:
   const roleClaimName = 'https://your-app-domain.com/roles';
   
   // To match what your application expects:
   const roleClaimName = 'https://example.com/roles';
   ```
4. Make sure your `ADMIN_EMAILS` secret is configured with your email address
5. Deploy the updated action

## Step 2: Verify the Admin Token

1. Log out of your application
2. Clear your browser cache and cookies for your application domain
3. Log back in with an email that's in your `ADMIN_EMAILS` list
4. Visit the `/debug` page (http://localhost:3000/debug)
5. Check that:
   - `https://example.com/roles` contains `["admin"]`
   - `x-hasura-default-role` is set to `"admin"`
   - `x-hasura-allowed-roles` includes `"admin"`

## Step 3: Test Admin Access

1. After confirming your token has the correct roles, visit `/admin/dashboard`
2. You should now be able to access the admin dashboard without being redirected away
3. Check that all admin functionality works as expected

## Troubleshooting

### If Roles Aren't Appearing in the Token:

1. Check Auth0 logs: 
   - Go to Auth0 Dashboard > **Monitoring** > **Logs**
   - Look for recent login events with your email
   - Check for any errors in the action execution

2. Verify email verification:
   - The action only assigns roles to verified emails
   - If your email isn't verified in Auth0, the action won't assign admin roles

3. Check action execution order:
   - Make sure your action is in the right position in the flow
   - It should run after the core authentication is complete

### If You Still Can't Access the Admin Dashboard:

1. Use the Debug page to see exactly what claims are in your token
2. Compare those claims with what the application expects in:
   - `src/lib/auth.ts` - The isAdmin() function
   - `src/app/admin/dashboard/page.tsx` - The admin access check

3. If necessary, update your application to match the claims in your token:
   ```typescript
   // In src/lib/auth.ts
   const ROLES_NAMESPACE = 'the-namespace-in-your-token/roles';
   ```

## Important Tips:

- Auth0 tokens are cached in the browser - always log out and back in after making changes
- Your email must be verified in Auth0 for roles to be assigned
- The namespace in your Auth0 action must match what your application checks for 