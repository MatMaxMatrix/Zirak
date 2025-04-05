import { getSession } from '@auth0/nextjs-auth0';
import jwt from 'jsonwebtoken';

export default async function token(req, res) {
  try {
    const session = await getSession(req, res);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check for admin role in all possible places
    const roles1 = session.user['https://example.com/roles'] || [];
    const roles2 = session.user['https://your-app-domain.com/roles'] || [];
    const allRoles = [...(Array.isArray(roles1) ? roles1 : []), ...(Array.isArray(roles2) ? roles2 : [])];
    
    // Check for admin status - if found in any role array or if admin email
    const isAdmin = allRoles.includes('admin') || session.user.email === 'admin@example.com' || 
                   session.user['x-hasura-default-role'] === 'admin';
    
    console.log('User:', session.user.email);
    console.log('Detected roles:', allRoles);
    console.log('Admin status:', isAdmin);
    
    // Create a JWT payload with role based on admin status
    const payload = {
      role: isAdmin ? 'service_role' : 'authenticated', // service_role bypasses RLS
      userId: session.user.sub,
      sub: session.user.sub,
      email: session.user.email,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      
      // Include auth0 ID for custom claims
      auth0_id: session.user.sub,
      
      // Include roles from Auth0
      roles: allRoles,
      
      // Include hasura claims for compatibility
      'x-hasura-default-role': isAdmin ? 'admin' : 'user',
      'x-hasura-allowed-roles': isAdmin ? ['admin', 'user'] : ['user'],
      'x-hasura-user-id': session.user.sub,
      
      // Add a direct is_admin flag
      is_admin: isAdmin
    };
    
    console.log('Creating token with payload:', JSON.stringify(payload, null, 2));
    
    // Sign the token with the Supabase JWT secret
    const accessToken = jwt.sign(
      payload, 
      process.env.SUPABASE_JWT_SECRET
    );
    
    // Return the token
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(error.status || 500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
} 