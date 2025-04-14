'use client';

// CSRF Token Header Name
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Store the CSRF token in the window object
let csrfToken: string | null = null;

// Initialize CSRF protection by fetching a token from the server
export async function initCSRF(): Promise<void> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important for cookies
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.statusText}`);
    }
    
    const data = await response.json();
    csrfToken = data.csrfToken;
    
    // Store the token for future use
    (window as any).__CSRF_TOKEN__ = csrfToken;
    
    console.log('CSRF token initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
}

// Get the CSRF token header for fetch requests
export function getCSRFHeader(): HeadersInit {
  // Use the stored token if available
  const token = csrfToken || (window as any).__CSRF_TOKEN__;
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

// Include CSRF token in all fetch requests
export async function fetchWithCSRF(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // If we don't have a token yet, try to get one
  if (!csrfToken && !(window as any).__CSRF_TOKEN__) {
    await initCSRF();
  }
  
  const headers = {
    ...options.headers,
    ...getCSRFHeader()
  };
  
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include credentials for CSRF requests
    headers
  });
} 