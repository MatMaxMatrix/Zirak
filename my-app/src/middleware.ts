import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features'];

// API routes to bypass
const apiRoutes = ['/api/auth', '/api/debug-token', '/api/admin/debug-profiles'];

// Routes to test without session check (temporary for debugging)
const bypassAuthRoutes = ['/user-dashboard-simple'];

// Protected routes that require authentication and should redirect to login with returnTo
const protectedRoutes = ['/chat', '/dashboard', '/debug', '/test-auth'];

// Add security headers to the response
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const contentSecurityPolicy = process.env.NODE_ENV === 'production'
    ? `
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https://www.google-analytics.com;
      font-src 'self';
      connect-src 'self' https://*.supabase.co https://www.google-analytics.com;
      frame-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `
    : `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co wss://api.zirak.dev:* ws://localhost:*;
      frame-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `;

  // Set security headers
  response.headers.set('Content-Security-Policy', contentSecurityPolicy.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`); // Log the pathname
  
  // Skip middleware for API routes
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    console.log(`[Middleware] Skipping API route: ${pathname}`);
    return NextResponse.next();
  }
  
  // Skip security headers for static assets
  const isStaticAsset = pathname.startsWith('/_next/') || 
                       pathname.includes('.') || 
                       pathname === '/favicon.ico';
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    console.log(`[Middleware] Allowing public route: ${pathname}`);
    const response = NextResponse.next();
    
    // Add security headers except for static assets
    if (!isStaticAsset) {
      return addSecurityHeaders(response);
    }
    
    return response;
  }
  
  // Allow access to bypassed auth routes for debugging (remove this in production)
  if (process.env.NODE_ENV !== 'production' && 
      bypassAuthRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    console.log(`[Middleware] Bypassing auth check for debugging: ${pathname}`);
    const response = NextResponse.next();
    
    // Add security headers except for static assets
    if (!isStaticAsset) {
      return addSecurityHeaders(response);
    }
    
    return response;
  }
  
  // Check if the route is protected and requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    try {
      const { supabase, response } = createClient(req);
      
      // Check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login with return URL
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('returnTo', pathname);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        
        // Add security headers
        if (!isStaticAsset) {
          return addSecurityHeaders(redirectResponse);
        }
        
        return redirectResponse;
      }
      
      // Add security headers
      if (!isStaticAsset) {
        return addSecurityHeaders(response);
      }
      
      return response;
    } catch (error) {
      console.error('[Middleware] Authentication error:', error);
      
      // Redirect to login with error on critical failure
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('error', 'auth_failure');
      const redirectResponse = NextResponse.redirect(redirectUrl);
      
      // Add security headers
      if (!isStaticAsset) {
        return addSecurityHeaders(redirectResponse);
      }
      
      return redirectResponse;
    }
  }

  const response = NextResponse.next();
  
  // Add security headers except for static assets
  if (!isStaticAsset) {
    return addSecurityHeaders(response);
  }
  
  return response;
}

// Matcher to apply middleware to specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 