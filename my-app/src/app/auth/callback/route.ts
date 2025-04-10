import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('[Auth Callback] Processing callback with code:', code ? 'present' : 'missing');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code:', error.message);
      return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error.message)}`);
    }

    const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === 'development';
    
    if (isLocalEnv) {
      // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
      console.log(`[Auth Callback] Redirecting to: ${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      console.log(`[Auth Callback] Redirecting to: https://${forwardedHost}${next}`);
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      console.log(`[Auth Callback] Redirecting to: ${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  console.error('[Auth Callback] No code parameter found');
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
} 