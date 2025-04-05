// pages/api/auth/[...auth0].js

import { handleAuth, handleCallback } from '@auth0/nextjs-auth0';
import jwt from 'jsonwebtoken';

const afterCallback = async (req, res, session) => {
  // Get the user's Auth0 roles and permissions
  const roles = session.user['https://example.com/roles'] || [];
  const permissions = session.user['https://example.com/permissions'] || [];
  
  // For development/testing: Add admin role for specific email
  if (session.user.email === 'admin@example.com' && !roles.includes('admin')) {
    // Only add the role if it doesn't already exist
    console.log('Adding admin role to user based on email');
    if (!Array.isArray(session.user['https://example.com/roles'])) {
      session.user['https://example.com/roles'] = [];
    }
    session.user['https://example.com/roles'].push('admin');
  }
  
  // Main payload with Auth0 user ID
  const payload = {
    userId: session.user.sub, // Auth0 user ID
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
    roles: session.user['https://example.com/roles'] || [],
    email: session.user.email,
  };

  // Generate JWT token with Supabase secret
  session.user.accessToken = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);

  return session;
};

export default handleAuth({
  async callback(req, res) {
    try {
      await handleCallback(req, res, { afterCallback });
    } catch (error) {
      res.status(error.status || 500).end(error.message);
    }
  },
});