import { generateCSRFTokenHandler } from '@/lib/csrf';
import { isRateLimited } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logging';

export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const response = NextResponse.next();
    const rateLimitResult = await isRateLimited(request as any, response, { 
      limit: 20, 
      window: 60
    });
    
    if (rateLimitResult.isLimited) {
      console.warn('CSRF token generation rate limited');
      return rateLimitResult.response;
    }
    
    // Generate and return CSRF token
    const tokenResponse = await generateCSRFTokenHandler(request);
    console.log('CSRF token generated successfully');
    
    return tokenResponse;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    
    // Return a clear error message
    return NextResponse.json({
      error: 'Failed to generate CSRF token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 