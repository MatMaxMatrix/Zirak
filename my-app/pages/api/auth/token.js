import { getSession } from '@auth0/nextjs-auth0';

export default async function handler(req, res) {
  try {
    const session = await getSession(req, res);
    
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Return the accessToken from the session
    return res.status(200).json({ accessToken: session.user.accessToken });
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return res.status(error.status || 500).json({
      code: error.code,
      error: error.message
    });
  }
} 