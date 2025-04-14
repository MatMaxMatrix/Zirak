import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features'];

// API routes to bypass
const apiRoutes = ['/api/auth', '/api/debug-token', '/api/admin/debug-profiles'];

// Routes to test without session check (temporary for debugging)
const bypassAuthRoutes = ['/user-dashboard-simple'];

// Protected routes that require authentication and should redirect to login with returnTo
const protectedRoutes = ['/chat', '/dashboard', '/debug', '/test-auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`); // Log the pathname
  
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
  
  // Allow access to bypassed auth routes for debugging (remove this in production)
  if (process.env.NODE_ENV !== 'production' && 
      bypassAuthRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    console.log(`[Middleware] Bypassing auth check for debugging: ${pathname}`);
    return NextResponse.next();
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
        return NextResponse.redirect(redirectUrl);
      }
      
      return response;
    } catch (error) {
      console.error('[Middleware] Authentication error:', error);
      
      // Redirect to login with error on critical failure
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('error', 'auth_failure');
      return NextResponse.redirect(redirectUrl);
    }
  }

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