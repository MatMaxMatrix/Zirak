import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';

// CSRF Token Cookie Name
const CSRF_COOKIE_NAME = 'csrf_token';
// CSRF Token Header Name
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Generate a random token
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash a token for safe storage in cookies
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Set CSRF token in a cookie (server-side only)
export function setCSRFCookie(token: string, response: Response) {
  const hashedToken = hashToken(token);
  
  // Set cookie directly in the response
  response.headers.set('Set-Cookie', 
    `${CSRF_COOKIE_NAME}=${hashedToken}; Path=/; HttpOnly; SameSite=Strict; ${
      process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
    }Max-Age=3600`
  );
}

// Generate and set a new CSRF token for a response
export function createCSRFToken(response: Response): string {
  const token = generateCSRFToken();
  setCSRFCookie(token, response);
  return token;
}

// Extract CSRF cookie value from request headers
export function getCSRFCookieFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value || '';
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[CSRF_COOKIE_NAME];
}

// Validate a token against the stored cookie hash from request
export function validateCSRFToken(token: string, request: Request): boolean {
  try {
    const storedHash = getCSRFCookieFromRequest(request);
    if (!storedHash || !token) return false;
    
    const submittedHash = hashToken(token);
    return submittedHash === storedHash;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

// Middleware to validate CSRF tokens in API routes
export async function csrfProtection(request: Request) {
  // Skip validation for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }
  
  try {
    // Get the token from the request header
    const csrfToken = request.headers.get(CSRF_HEADER_NAME);
    
    if (!csrfToken) {
      return { 
        valid: false, 
        error: 'CSRF token missing' 
      };
    }
    
    // Validate the token
    const isValid = validateCSRFToken(csrfToken, request);
    
    if (!isValid) {
      return { 
        valid: false, 
        error: 'Invalid CSRF token' 
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('CSRF protection error:', error);
    return { 
      valid: false, 
      error: 'CSRF validation failed' 
    };
  }
}

// Server-side API route to generate and send a new CSRF token
export async function generateCSRFTokenHandler(request: Request) {
  const response = new Response(JSON.stringify({ 
    success: true 
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Create and set the CSRF token
  const token = createCSRFToken(response);
  
  // Add the token to the response JSON
  return new Response(JSON.stringify({ 
    success: true,
    csrfToken: token
  }), {
    headers: response.headers,
    status: 200,
  });
}

// Client-side - Get the CSRF token header for fetch requests
export function getCSRFHeader(): HeadersInit {
  const token = (window as any).__CSRF_TOKEN__;
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

// Client-side - Include CSRF token in all fetch requests
export function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getCSRFHeader()
  };
  
  return fetch(url, {
    ...options,
    headers
  });
} 