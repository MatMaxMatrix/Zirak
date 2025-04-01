import { handleLogin } from '@auth0/nextjs-auth0';

export default async function login(req, res) {
  try {
    // Get the returnTo URL from query parameters
    const returnTo = req.query.returnTo || '/';
    
    // Force prompt=login to make Auth0 show the login screen every time
    await handleLogin(req, res, {
      authorizationParams: {
        prompt: 'login',
      },
      returnTo: returnTo,
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).end(error.message);
  }
} 