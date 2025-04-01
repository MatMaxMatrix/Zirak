import { handleAuth, handleCallback } from '@auth0/nextjs-auth0';

// Only handle the callback in the catch-all route, as we have custom login and logout handlers
export default handleAuth({
  callback: handleCallback,
}); 