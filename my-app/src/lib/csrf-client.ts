'use client';

// CSRF Token Header Name
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Store the CSRF token in the window object
let csrfToken: string | null = null;
let isInitializing = false; // Flag to prevent concurrent initializations
let initializationPromise: Promise<void> | null = null;

// Initialize CSRF protection by fetching a token from the server
export async function initCSRF(): Promise<void> {
  // If already initializing, return existing promise
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }
  
  // Check if we already have a token
  if (csrfToken || (typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__)) {
    csrfToken = csrfToken || (window as any).__CSRF_TOKEN__;
    console.log('CSRF token already initialized');
    return Promise.resolve();
  }
  
  // Set initializing flag
  isInitializing = true;
  
  // Create initialization promise
  initializationPromise = new Promise<void>(async (resolve, reject) => {
    try {
      console.log('Fetching CSRF token from server...');
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Important for cookies
        cache: 'no-store', // Don't cache token requests
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
      
      console.log('CSRF token initialized successfully');
      resolve();
    } catch (error) {
      console.error('Failed to initialize CSRF protection:', error);
      reject(error);
    } finally {
      isInitializing = false;
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
      // We'll continue the request anyway, but it might fail if CSRF protection is required
    }
  }
  
  const headers = {
    ...options.headers,
    ...getCSRFHeader()
  };
  
  // Add credentials to include cookies
  const fetchOptions = {
    ...options,
    credentials: 'include' as RequestCredentials, // Always include credentials for CSRF requests
    headers
  };
  
  // Log if no CSRF token is found
  if (!csrfToken && !(typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__)) {
    console.warn(`Making request to ${url} without CSRF token.`);
  }
  
  return fetch(url, fetchOptions);
} 