import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isRateLimited } from '@/lib/rate-limit';
import { Logger, extractRequestInfo } from '@/lib/logging';

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Handle waitlist API requests
 * 
 * @param request - The incoming request object
 * @returns Response with waitlist submission result
 */
export async function POST(request: Request) {
  // Extract request info for logging
  const requestInfo = extractRequestInfo(request);
  
  // Create initial response
  const response = NextResponse.next();
  
  // Apply rate limiting (5 submissions per hour from the same IP)
  const rateLimitResult = await isRateLimited(request as any, response, { 
    limit: 5, 
    window: 3600,
    blockDuration: 7200 // Block for 2 hours after exceeding
  });
  
  if (rateLimitResult.isLimited) {
    Logger.security('Rate limit exceeded for waitlist submission', {
      ...requestInfo,
      context: { action: 'waitlist_submission', result: 'rate_limited' }
    });
    return NextResponse.json(
      { error: 'Too many submission attempts. Please try again later.' }, 
      { 
        status: 429,
        headers: {
          'Retry-After': '7200',
          ...rateLimitResult.response.headers
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
      Logger.warn('Invalid JSON in waitlist request', {
        ...requestInfo,
        context: { action: 'waitlist_submission', result: 'invalid_json' }
      });
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    const { email, source = 'homepage' } = body;
    
    // Input validation
    if (!email) {
      Logger.warn('Missing email in waitlist submission', {
        ...requestInfo,
        context: { action: 'waitlist_submission', result: 'missing_email' }
      });
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      Logger.warn('Invalid email format in waitlist submission', {
        ...requestInfo,
        context: { action: 'waitlist_submission', result: 'invalid_email_format' }
      });
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    
    // Get IP address from request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // Connect to Supabase
    const supabase = await createClient();
    
    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('waitlist_emails')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    
    if (existingEmail) {
      // Email already exists, but don't reveal this for privacy
      Logger.info('Email already on waitlist', {
        ...requestInfo,
        context: { action: 'waitlist_submission', result: 'already_exists' }
      });
      
      // Return success anyway to avoid leaking information
      return NextResponse.json(
        { success: true, message: 'Thank you for your interest!' },
        { status: 200 }
      );
    }
    
    // Add email to waitlist
    const { error } = await supabase
      .from('waitlist_emails')
      .insert([
        { 
          email: email.toLowerCase().trim(), 
          source, 
          ip_address: ipAddress 
        }
      ]);
    
    if (error) {
      // Log the error, but return a generic error message
      Logger.error('Error inserting waitlist email', {
        ...requestInfo,
        context: { 
          action: 'waitlist_submission', 
          result: 'insertion_error',
          error: error.message
        }
      });
      
      if (error.code === '23505') { // Unique violation
        // Email already exists (duplicate key), but don't reveal this
        return NextResponse.json(
          { success: true, message: 'Thank you for your interest!' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: 'Unable to add you to the waitlist. Please try again later.' },
        { status: 500 }
      );
    }
    
    // Log successful submission
    Logger.info('Waitlist submission successful', {
      ...requestInfo,
      context: { 
        action: 'waitlist_submission', 
        result: 'success',
        email
      }
    });
    
    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Thank you! You have been added to our waitlist.' 
      },
      { status: 200 }
    );
    
  } catch (unexpectedError) {
    Logger.error('Unexpected error during waitlist submission', {
      ...requestInfo,
      context: { error: unexpectedError }
    });
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 