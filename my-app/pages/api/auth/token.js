import { getSession } from '@auth0/nextjs-auth0';
import jwt from 'jsonwebtoken';

export default async function token(req, res) {
  try {
    const session = await getSession(req, res);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Create a simpler JWT focused only on what's needed for RLS
    const payload = {
      role: 'authenticated', // This matches the RLS policy expectations
      sub: session.user.sub,  // Required for auth.uid() in RLS
      email: session.user.email,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      
      // Include auth0 ID for custom claims
      auth0_id: session.user.sub,
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