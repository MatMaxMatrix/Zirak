import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features'];

// API routes to bypass
const apiRoutes = ['/api/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for API routes
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Check for session cookie
  const sessionCookie = req.cookies.get('appSession');
  
  // If no session cookie, redirect to login
  if (!sessionCookie) {
    const url = new URL('/api/auth/login', req.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }
  
  // Allow authenticated requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}; 