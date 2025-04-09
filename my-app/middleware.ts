import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSession } from "@auth0/nextjs-auth0/edge";

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features', '/verify-email'];

// API routes to bypass
const apiRoutes = ['/api/auth', '/api/debug-token', '/api/admin/debug-profiles'];

// Routes to test without session check (temporary for debugging)
const bypassAuthRoutes = ['/user-dashboard-simple', '/user-dashboard', '/auth-debug'];

// Protected routes that require authentication and should redirect to login with returnTo
const protectedRoutes = ['/chat', '/dashboard', '/debug', '/test-auth'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`); // Log the pathname
  
  // Handle Auth0 callback errors (particularly for unverified emails)
  if (pathname === '/api/auth/callback' && search.includes('error=access_denied')) {
    console.log('[Middleware] Auth0 access_denied error detected');
    // Redirect to the verify-email page
    return NextResponse.redirect(new URL('/verify-email', req.url));
  }
  
  // Skip middleware for API routes
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    console.log(`[Middleware] Skipping API route: ${pathname}`);
    return NextResponse.next();
  }
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    console.log(`[Middleware] Allowing public route: ${pathname}`);
    return NextResponse.next();
  }
  
  // Allow access to bypassed auth routes for debugging
  if (bypassAuthRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    console.log(`[Middleware] Bypassing auth check for debugging: ${pathname}`);
    return NextResponse.next();
  }
  
  // Check if the route is protected and requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  console.log(`[Middleware] Is protected route (${pathname})? ${isProtectedRoute}`);
  
  // For all routes except verify-email, check if email is verified
  if (pathname !== '/verify-email') {
    try {
      // Get the session to check email verification status
      const session = await getSession(req, NextResponse.next());
      
      // If there's a session and the user's email is not verified
      if (session?.user && session.user.needsVerification === true) {
        console.log(`[Middleware] User email not verified. Redirecting to verification page.`);
        // Store original path if needed
        const returnPath = isProtectedRoute ? `?returnTo=${encodeURIComponent(pathname)}` : '';
        const url = new URL(`/verify-email${returnPath}`, req.url);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('[Middleware] Error checking session:', error);
    }
  }
  
  if (isProtectedRoute) {
    // Check for session cookie
    const sessionCookie = req.cookies.get('appSession');
    console.log(`[Middleware] Session cookie status for ${pathname}:`, sessionCookie ? 'Found' : 'Missing'); // Log cookie status
    
    if (sessionCookie) {
      console.log(`[Middleware] Session cookie found. Value length: ${sessionCookie.value.length}`);
    }
    
    // If no session cookie, redirect to login with returnTo parameter
    if (!sessionCookie) {
      console.log(`[Middleware] No session cookie found. Redirecting ${pathname} to login.`);
      const url = new URL('/api/auth/login', req.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }
  }
  
  // Allow authenticated requests or non-protected routes
  console.log(`[Middleware] Allowing request for ${pathname}`);
  return NextResponse.next();
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
}; 