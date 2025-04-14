'use client';

import { useEffect, useState } from 'react';
import { initCSRF } from '@/lib/csrf-client';

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        await initCSRF();
        setInitialized(true);
        console.log('[CSRFProvider] CSRF token initialized successfully');
      } catch (error) {
        console.error('[CSRFProvider] Failed to initialize CSRF token:', error);
        // Try again after a short delay
        setTimeout(() => initializeCSRF(), 2000);
      }
    };

    initializeCSRF();
  }, []);

  return <>{children}</>;
} 