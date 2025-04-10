import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Log the pathname for debugging
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes completely
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Skipping API route: ${pathname}`);
    return NextResponse.next();
  }

  try {
    const { supabase, response } = createClient(request)

    // Check if we have a session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protected routes that require authentication
    const protectedPaths = [
      '/dashboard',
      '/user-dashboard',
      '/admin-dashboard',
      '/profile',
      '/settings',
    ]

    // Check if the path matches any protected route
    const isProtectedPath = protectedPaths.some((path) => 
      pathname.startsWith(path)
    )

    // Redirect unauthenticated users to login page if trying to access protected routes
    if (isProtectedPath && !session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    console.error('[Middleware] Error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Protected routes that need auth
    '/dashboard/:path*',
    '/user-dashboard/:path*',
    '/admin-dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
  ],
} 