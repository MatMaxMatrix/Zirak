import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const createClient = (request: NextRequest) => {
  // Create a Supabase client for Server Components
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            try {
              return request.cookies.get(name)?.value
            } catch (error) {
              console.error(`Error getting cookie ${name}:`, error)
              return undefined
            }
          },
          set(name: string, value: string, options: any) {
            // In middleware, we need to explicitly set cookies in the response
            // We'll handle this by returning the cookies to be set
            try {
              if (options?.expires) {
                // convert Date to string
                options.expires = options.expires.toUTCString()
              }
            } catch (error) {
              console.error(`Error setting cookie ${name}:`, error)
            }
          },
          remove(name: string, options: any) {
            // Similar to set, we'll handle this in the response
            try {
              // Nothing to do here since we're not modifying the response directly
            } catch (error) {
              console.error(`Error removing cookie ${name}:`, error)
            }
          },
        },
      }
    )

    // Create a new response
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    return { supabase, response }
  } catch (error) {
    console.error("Error creating Supabase client in middleware:", error)
    
    // Return a fallback response to prevent crashes
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    
    return { 
      supabase: null,
      response 
    }
  }
} 