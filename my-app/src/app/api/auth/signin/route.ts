import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';
import { csrfProtection } from '@/lib/csrf';
import { Logger, extractRequestInfo } from '@/lib/logging';

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Handle sign-in API requests
 * 
 * @param request - The incoming request object
 * @returns Response with sign-in result
 */
export async function POST(request: Request) {
  // Extract request info for logging
  const requestInfo = extractRequestInfo(request);
  
  // Create initial response
  const response = NextResponse.next();
  
  // Apply rate limiting (15 login attempts per 5 minutes)
  const rateLimitResult = await isRateLimited(request as any, response, { 
    limit: 15, 
    window: 300,
    blockDuration: 600 // Block for 10 minutes after exceeding
  });
  
  if (rateLimitResult.isLimited) {
    Logger.security('Rate limit exceeded for login attempt', {
      ...requestInfo,
      context: { action: 'login_attempt', result: 'rate_limited' }
    });
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' }, 
      { 
        status: 429,
        headers: {
          'Retry-After': '600',
          ...rateLimitResult.response.headers
        } 
      }
    );
  }
  
  // Validate CSRF token
  const csrfResult = await csrfProtection(request);
  if (!csrfResult.valid) {
    Logger.security('Invalid CSRF token for login attempt', {
      ...requestInfo,
      context: { 
        action: 'login_attempt', 
        result: 'csrf_failure',
        error: csrfResult.error
      }
    });
    return NextResponse.json(
      { error: csrfResult.error }, 
      { 
        status: 403,
        headers: {
          'X-CSRF-Error': 'true'
        }
      }
    );
  }
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      Logger.warn('Invalid JSON in login request', {
        ...requestInfo,
        context: { action: 'login_attempt', result: 'invalid_json' }
      });
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    const { email, password } = body;
    
    // Input validation
    if (!email || !password) {
      Logger.warn('Missing login credentials', {
        ...requestInfo,
        context: { action: 'login_attempt', result: 'missing_credentials' }
      });
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      Logger.warn('Invalid email format in login attempt', {
        ...requestInfo,
        context: { action: 'login_attempt', result: 'invalid_email_format' }
      });
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Attempt authentication with Supabase
    const supabase = await createClient();
    
    Logger.info('Attempting to sign in user', {
      ...requestInfo,
      context: { action: 'login_attempt', email }
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Add delay to prevent timing attacks that could reveal valid email addresses
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      Logger.security('Login failure', {
        ...requestInfo,
        context: { 
          action: 'login_attempt', 
          result: 'failure',
          email,
          error: error.message
        }
      });
      
      // Use generic error message for security
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Record login history
    try {
      if (data.user) {
        const loginHistoryResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://zirak.dev"}/api/auth/login-history`, 
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              // Add an internal API key or signature if available in production
              ...(process.env.INTERNAL_API_KEY ? { 'X-Internal-Key': process.env.INTERNAL_API_KEY } : {})
            },
            body: JSON.stringify({ 
              userId: data.user.id,
              source: 'api',
              success: true
            }),
          }
        );
        
        if (!loginHistoryResponse.ok) {
          Logger.warn('Failed to record login history', {
            ...requestInfo,
            userId: data.user.id,
            context: { error: await loginHistoryResponse.text() }
          });
        }
        
        // Log successful login
        Logger.security('Login successful', {
          ...requestInfo,
          userId: data.user.id,
          context: { 
            action: 'login_attempt', 
            result: 'success',
            email: data.user.email
          }
        });
      }
    } catch (historyError) {
      Logger.error('Error recording login history', {
        ...requestInfo,
        userId: data.user?.id,
        context: { error: historyError }
      });
      // Continue processing despite history error
    }

    // If we got here, sign-in was successful
    return NextResponse.json(
      { 
        success: true, 
        user: { 
          id: data.user.id, 
          email: data.user.email 
        } 
      },
      { 
        status: 200,
        headers: {
          // Add cache control headers to prevent caching of this response
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
    );
  } catch (unexpectedError) {
    Logger.error('Unexpected error during sign in', {
      ...requestInfo,
      context: { error: unexpectedError }
    });
    return NextResponse.json(
      { error: 'An error occurred during sign in' },
      { status: 500 }
    );
  }
} 