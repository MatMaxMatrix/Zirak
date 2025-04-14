'use client';

// CSRF Token Header Name
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Store the CSRF token in the window object
let csrfToken: string | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Initialize CSRF protection by fetching a token from the server
export async function initCSRF(): Promise<void> {
  // If already initializing, return the existing promise
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }
  
  isInitializing = true;
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      // Check if we already have a token
      if (csrfToken || (typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__)) {
        isInitializing = false;
        resolve();
        return;
      }
      
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include' as RequestCredentials, // Important for cookies
        cache: 'no-store' as RequestCache, // Don't cache the token request
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('CSRF token not found in response');
      }
      
      csrfToken = data.csrfToken;
      
      // Store the token for future use
      if (typeof window !== 'undefined') {
        (window as any).__CSRF_TOKEN__ = csrfToken;
      }
      
      console.log('CSRF token initialized');
      isInitializing = false;
      resolve();
    } catch (error) {
      console.error('Failed to initialize CSRF protection:', error);
      isInitializing = false;
      reject(error);
    }
  });
  
  return initializationPromise;
}

// Get the CSRF token header for fetch requests
export function getCSRFHeader(): HeadersInit {
  // Use the stored token if available
  const token = csrfToken || (typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__);
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

// Include CSRF token in all fetch requests
export async function fetchWithCSRF(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // If we don't have a token yet, try to get one
  if (!csrfToken && typeof window !== 'undefined' && !(window as any).__CSRF_TOKEN__) {
    try {
      await initCSRF();
    } catch (error) {
      console.warn('Failed to initialize CSRF token before request:', error);
      // In production, we'll still try to make the request without the token
      // The server will handle the missing token appropriately
    }
  }
  
  const headers = {
    ...options.headers,
    ...getCSRFHeader()
  };
  
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include' as RequestCredentials, // Always include credentials for CSRF requests
    headers
  };
  
  try {
    return await fetch(url, fetchOptions);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
} 