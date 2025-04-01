import { handleAuth } from '@auth0/nextjs-auth0';

// Directly pass configuration from environment variables to handleAuth
export default handleAuth({
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.APP_BASE_URL,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    scope: process.env.AUTH0_SCOPE || 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE, // Reads the audience if defined
  },
}); 