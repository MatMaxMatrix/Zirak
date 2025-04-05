// pages/api/auth/[...auth0].js

import { handleAuth, handleCallback } from '@auth0/nextjs-auth0';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables for Supabase');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const afterCallback = async (req, res, session) => {
  // Get the user's Auth0 roles and permissions
  const roles = session.user['https://example.com/roles'] || [];
  const permissions = session.user['https://example.com/permissions'] || [];
  
  // For development/testing: Add admin role for specific email
  if (session.user.email === 'admin@example.com' && !roles.includes('admin')) {
    // Only add the role if it doesn't already exist
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

  // Record login event
  try {
    // Get basic device info from user agent
    const userAgent = req.headers['user-agent'] || '';
    let device = 'Unknown';
    
    if (userAgent.includes('Windows')) {
      device = `Browser on Windows`;
    } else if (userAgent.includes('Mac')) {
      device = `Browser on macOS`;
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      device = `Browser on iOS`;
    } else if (userAgent.includes('Android')) {
      device = `Browser on Android`;
    } else {
      device = `Browser on Unknown OS`;
    }

    if (userAgent.includes('Chrome')) {
      device = `Chrome on ${device.split(' ')[2] || 'Unknown'}`;
    } else if (userAgent.includes('Firefox')) {
      device = `Firefox on ${device.split(' ')[2] || 'Unknown'}`;
    } else if (userAgent.includes('Safari')) {
      device = `Safari on ${device.split(' ')[2] || 'Unknown'}`;
    }

    // Get IP address
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip_address = (forwardedFor ? forwardedFor.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
    
    // Use the record_user_login function to handle both profile and login history
    await supabase.rpc(
      'record_user_login',
      {
        p_user_id: session.user.sub,
        p_email: session.user.email,
        p_name: session.user.name || session.user.email.split('@')[0],
        p_picture: session.user.picture,
        p_device: device,
        p_ip: ip_address
      }
    );
  } catch (error) {
    console.error('Failed to record login history:', error);
  }

  return session;
};

export default handleAuth({
  async callback(req, res) {
    try {
      await handleCallback(req, res, { afterCallback });
    } catch (error) {
      console.error('Error in Auth0 callback:', error);
      res.status(error.status || 500).end(error.message);
    }
  },
});