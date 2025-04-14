import { generateCSRFTokenHandler } from '@/lib/csrf';
import { isRateLimited } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Apply rate limiting
  const response = NextResponse.next();
  const rateLimitResult = await isRateLimited(request as any, response, { 
    limit: 20, 
    window: 60
  });
  
  if (rateLimitResult.isLimited) {
    return rateLimitResult.response;
  }
  
  return generateCSRFTokenHandler(request);
} 