import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';
import { csrfProtection } from '@/lib/csrf';
import { Logger, extractRequestInfo } from '@/lib/logging';

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    return rateLimitResult.response;
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
    return NextResponse.json({ error: csrfResult.error }, { status: 403 });
  }
  
  try {
    const body = await request.json();
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
        { status: 400 }
      );
    }

    // Record login history
    try {
      if (data.user) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/login-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id }),
        });
        
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
    }

    // If we got here, sign-in was successful
    return NextResponse.json(
      { success: true, user: { id: data.user.id, email: data.user.email } },
      { status: 200 }
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