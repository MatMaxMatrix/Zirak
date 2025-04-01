import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// List of public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/features'];

// List of API and static routes that should not be checked
const bypassRoutes = [
  '/api/auth',
  '/auth',
  '/_next',
  '/favicon.ico',
  '/sitemap.xml',
  '/robots.txt'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for bypass routes
  if (bypassRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Get the Auth0 session cookie
  const sessionCookie = request.cookies.get('appSession');
  
  // If no session cookie is present, redirect to login
  if (!sessionCookie) {
    const url = new URL('/api/auth/login', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }
  
  // User has a session cookie, allow access
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