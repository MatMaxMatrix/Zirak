import { initAuth0 } from "@auth0/nextjs-auth0";

// Initialize the Auth0 client 
export const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
  },
  session: {
    // Use absolute path for cookies
    absoluteDuration: 24 * 60 * 60, // 24 hours
    cookie: {
      // Very permissive cookie settings for debugging
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
      domain: '', // Empty string means the current domain
      transient: false
    },
  },
  authorizationParams: {
    scope: process.env.AUTH0_SCOPE || 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
    prompt: 'login',
    response_type: 'code',
  }
}); 