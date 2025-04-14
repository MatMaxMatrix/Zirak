import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client for rate limiting
let redis: Redis | null = null;

try {
  // Only initialize if Redis URL is available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Redis client:', error);
}

// Memory-based fallback for local development or if Redis is unavailable
const ipRequests = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  limit: number;      // Maximum requests allowed
  window: number;     // Time window in seconds
  blockDuration?: number; // Optional: time to block after exceeding limit (seconds)
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = { limit: 10, window: 60 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Get client IP from headers if available, fallback to forwarded or real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 'anonymous';
  
  const key = `rate-limit:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const resetTime = now + options.window;
  
  // Use Redis if available
  if (redis) {
    try {
      const [count] = await redis.pipeline()
        .incr(key)
        .expire(key, options.window)
        .exec() as [number];
      
      const remaining = Math.max(0, options.limit - count);
      
      // If exceeded limit and blockDuration is set, create a block record
      if (count > options.limit && options.blockDuration) {
        await redis.set(`block:${ip}`, '1', { ex: options.blockDuration });
      }
      
      return { 
        success: count <= options.limit, 
        limit: options.limit, 
        remaining, 
        reset: resetTime 
      };
    } catch (error) {
      console.error('Redis rate limiting error:', error);
      // Fall back to memory-based limiting on Redis failure
    }
  }
  
  // Memory-based rate limiting fallback
  const record = ipRequests.get(ip);
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Reset expired records
  if (record && record.resetTime <= currentTime) {
    ipRequests.delete(ip);
  }
  
  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, { count: 1, resetTime });
    return { success: true, limit: options.limit, remaining: options.limit - 1, reset: resetTime };
  }
  
  const currentRecord = ipRequests.get(ip)!;
  currentRecord.count += 1;
  ipRequests.set(ip, currentRecord);
  
  const remaining = Math.max(0, options.limit - currentRecord.count);
  const success = currentRecord.count <= options.limit;
  
  // Implement blocking if configured
  if (!success && options.blockDuration) {
    ipRequests.set(ip, { 
      count: currentRecord.count, 
      resetTime: currentTime + options.blockDuration 
    });
  }
  
  return { success, limit: options.limit, remaining, reset: resetTime };
}

export async function isRateLimited(
  request: NextRequest, 
  response: NextResponse,
  options: RateLimitOptions = { limit: 10, window: 60 }
): Promise<{ isLimited: boolean; response?: NextResponse }> {
  const result = await rateLimit(request, options);
  
  if (!result.success) {
    const retryAfter = result.reset - Math.floor(Date.now() / 1000);
    const errorResponse = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset)
        }
      }
    );
    return { isLimited: true, response: errorResponse };
  }
  
  // Add rate limit headers to successful response
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  
  return { isLimited: false };
} 