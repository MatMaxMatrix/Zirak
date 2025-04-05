import { getSession } from '@auth0/nextjs-auth0';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// This API endpoint will help debug fetching profiles from Supabase
export default async function handler(req, res) {
  try {
    // Get the current user's session
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
    const isAdmin = allRoles.includes('admin') || 
                   session.user.email === 'admin@example.com' || 
                   session.user['x-hasura-default-role'] === 'admin';
    
    console.log('User:', session.user.email);
    console.log('Roles found:', allRoles);
    console.log('Admin status:', isAdmin);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Create a JWT payload with service_role
    const payload = {
      role: 'service_role', // This should bypass RLS
      userId: session.user.sub,
      sub: session.user.sub,
      email: session.user.email,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      is_admin: true,
      'x-hasura-default-role': 'admin',
      'x-hasura-allowed-roles': ['admin', 'user'],
      'x-hasura-user-id': session.user.sub
    };
    
    // Sign the token with the Supabase JWT secret
    const adminToken = jwt.sign(
      payload, 
      process.env.SUPABASE_JWT_SECRET
    );
    
    // Create a Supabase client with the admin token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      }
    );
    
    // Try to fetch all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch profiles', 
        details: error.message,
        hint: error.hint,
        code: error.code
      });
    }
    
    // Return the profiles and token info for debugging
    return res.status(200).json({
      profiles,
      count: profiles?.length || 0,
      token: {
        role: payload.role,
        userId: payload.userId,
        email: payload.email,
        is_admin: payload.is_admin
      }
    });
  } catch (error) {
    console.error('Error in debug-profiles:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
} 