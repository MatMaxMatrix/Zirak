import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features'];

// API routes to bypass
const apiRoutes = ['/api/auth', '/api/debug-token', '/api/admin/debug-profiles'];

// Routes to test without session check (temporary for debugging)
const bypassAuthRoutes = ['/user-dashboard-simple', '/user-dashboard', '/auth-debug'];

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
  
  // Allow access to bypassed auth routes for debugging
  if (bypassAuthRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    console.log(`[Middleware] Bypassing auth check for debugging: ${pathname}`);
    return NextResponse.next();
  }
  
  // Check if the route is protected and requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    // TODO: Add Supabase authentication check here
    // For now, we'll just allow access
    return NextResponse.next();
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