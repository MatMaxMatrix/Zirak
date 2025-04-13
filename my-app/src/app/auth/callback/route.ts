import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// List of allowed redirect paths for security
const ALLOWED_REDIRECT_PATHS = [
  // '/dashboard', // Removed
  '/reset-password',
  '/profile',
  '/'
];

// Validate redirect path to prevent open redirects
function isValidRedirectPath(path: string): boolean {
  // Must start with / and be in allowed list or match specific pattern
  if (!path.startsWith('/')) return false;
  
  // Check if it's in our allowed list
  if (ALLOWED_REDIRECT_PATHS.includes(path)) return true;
  
  // Otherwise reject
  return false;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // Get redirect destinations
  const next = searchParams.get('next') ?? '/'; // Default to home page
  const redirectTo = searchParams.get('redirect_to');
  
  console.log('[Auth Callback] Request received', { 
    hasCode: !!code,
    redirectTo,
    next
  });
  
  // Validate and sanitize redirect paths
  const redirectPath = redirectTo && isValidRedirectPath(redirectTo) 
    ? redirectTo 
    : isValidRedirectPath(next) 
      ? next 
      : '/'; // Fallback to safe default (home page)
  
  console.log('[Auth Callback] Final redirect path:', redirectPath);

  if (code) {
    try {
      const supabase = await createClient();
      console.log('[Auth Callback] Exchanging code for session');
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Session exchange error:', error.message, error);
        return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed: ' + error.message)}`);
      }

      console.log('[Auth Callback] Session exchange successful', { 
        hasSession: !!data?.session,
        user: data?.session?.user?.id ? 'authenticated' : 'missing' 
      });

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      // Determine correct base URL
      let baseUrl = origin;
      if (!isLocalEnv && forwardedHost) {
        baseUrl = `https://${forwardedHost}`;
      }
      
      const redirectUrl = `${baseUrl}${redirectPath}`;
      console.log('[Auth Callback] Redirecting to:', redirectUrl);
      
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      console.error('[Auth Callback] Unexpected error in callback:', error);
      return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed due to an unexpected error')}`);
    }
  }

  // No code parameter found
  console.error('[Auth Callback] No code parameter found in URL');
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed: Missing verification code')}`);
} 