import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// List of allowed redirect paths for security
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
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
  const next = searchParams.get('next') ?? '/dashboard';
  const redirectTo = searchParams.get('redirect_to');
  
  // Validate and sanitize redirect paths
  const redirectPath = redirectTo && isValidRedirectPath(redirectTo) 
    ? redirectTo 
    : isValidRedirectPath(next) 
      ? next 
      : '/dashboard'; // Fallback to safe default

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth] Session exchange error');
        return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed')}`);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      // Determine correct base URL
      let baseUrl = origin;
      if (!isLocalEnv && forwardedHost) {
        baseUrl = `https://${forwardedHost}`;
      }
      
      return NextResponse.redirect(`${baseUrl}${redirectPath}`);
    } catch (error) {
      console.error('[Auth] Unexpected error in callback');
      return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed')}`);
    }
  }

  // No code parameter found
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed')}`);
} 