import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req, res) {
  try {
    console.log("[Token API] Requesting session token");
    const session = await getSession(req, res);
    
    if (!session) {
      console.log("[Token API] No session found");
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log("[Token API] Session found for user:", session.user.email);
    
    // Return the accessToken from the session
    if (!session.user.accessToken) {
      console.log("[Token API] No accessToken in session");
      return res.status(400).json({ error: 'No access token available' });
    }
    
    console.log("[Token API] Returning access token (length:", session.user.accessToken.length, ")");
    return res.status(200).json({ accessToken: session.user.accessToken });
  } catch (error) {
    console.error('[Token API] Error retrieving access token:', error);
    return res.status(error.status || 500).json({
      code: error.code,
      error: error.message
    });
  }
} 