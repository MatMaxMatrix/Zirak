import { initAuth0 } from '@auth0/nextjs-auth0';

// Initialize the Auth0 client 
export const auth0 = initAuth0({
  // The secret used to encrypt the cookie
  secret: process.env.AUTH0_SECRET,
  // The base URL of your application
  baseURL: process.env.APP_BASE_URL,
  // The URL of your Auth0 tenant domain
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  // Your Auth0 application's Client ID
  clientID: process.env.AUTH0_CLIENT_ID,
  // Your Auth0 application's Client Secret
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  // The routes used by Auth0
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  // Authentication parameters
  authorizationParams: {
    scope: process.env.AUTH0_SCOPE || 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
  },
}); 