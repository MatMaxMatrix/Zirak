'use client';

import { useEffect, useState } from 'react';
import { initCSRF } from '@/lib/csrf-client';

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        await initCSRF();
        setIsInitialized(true);
        console.log('CSRF protection initialized successfully');
      } catch (error) {
        console.error('Failed to initialize CSRF protection:', error);
        // Retry after a delay in production
        if (process.env.NODE_ENV === 'production') {
          setTimeout(() => initializeCSRF(), 2000);
        }
      }
    };

    initializeCSRF();
  }, []);

  return <>{children}</>;
} 