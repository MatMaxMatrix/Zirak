import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req, res) {
  try {
    // Get the current user's session
    const session = await getSession(req, res);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Return the session data including all claims
    return res.status(200).json({ 
      session: {
        user: session.user,
        // Include specifically the roles to check if they exist
        roles: session.user['https://example.com/roles'],
        // Check custom domain roles (from your Action)
        customDomainRoles: session.user['https://your-app-domain.com/roles'],
        // Also check for other potential namespaces
        rolesAlt: session.user.roles,
        // Check Auth0 permissions
        permissions: session.user.permissions,
        // Hasura specific claims
        hasuraRole: session.user['x-hasura-default-role'],
        hasuraAllowedRoles: session.user['x-hasura-allowed-roles'],
        hasuraUserId: session.user['x-hasura-user-id'],
        // Raw access token
        accessToken: session.accessToken ? '[TOKEN FOUND]' : '[NO TOKEN]',
        // Check for other common claims
        email: session.user.email,
        isAdmin: session.user.email === "admin@example.com",
      }
    });
  } catch (error) {
    console.error('Error in debug-token:', error);
    return res.status(500).json({ 
      error: 'Failed to debug token',
      details: error.message 
    });
  }
} 