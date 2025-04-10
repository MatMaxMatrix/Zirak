'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authCheckRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);
  const lastRefreshTimeRef = useRef<number>(0);

  // Function to refresh user data when needed with throttling
  const refreshUser = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (refreshingRef.current) {
      console.log("[AuthProvider] Refresh already in progress, skipping");
      return;
    }
    
    // Throttle refreshes to once every 2 seconds
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 2000) {
      console.log("[AuthProvider] Refresh throttled");
      return;
    }
    
    try {
      refreshingRef.current = true;
      lastRefreshTimeRef.current = now;
      
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("[AuthProvider] Error refreshing user:", error);
        return;
      }
      
      console.log("[AuthProvider] User refreshed:", data.user?.email);
      setUser(data.user);
    } catch (err) {
      console.error("[AuthProvider] Refresh error:", err);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let debounceTimer: NodeJS.Timeout | null = null;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (!authCheckRef.current) {
        console.log("[AuthProvider] Initial session:", session?.user?.email);
        setUser(session?.user ?? null);
        setIsLoading(false);
        authCheckRef.current = true;
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Debounce state updates to prevent rapid changes
      debounceTimer = setTimeout(() => {
        // Only update state if we have a real auth state change
        if (_event !== 'INITIAL_SESSION') {
          console.log("[AuthProvider] Auth state changed:", _event, session?.user?.email);
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      }, 100);
    });

    // Add a visibility change listener to prevent unnecessary reloads
    const handleVisibilityChange = () => {
      console.log("[AuthProvider] Visibility changed:", document.visibilityState);
      // Only refresh if becoming visible and we already have a user
      if (document.visibilityState === 'visible' && user && !refreshingRef.current) {
        // Don't refresh immediately to prevent rapid changes
        debounceTimer = setTimeout(() => {
          console.log("[AuthProvider] Refreshing after visibility change");
          refreshUser();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser]);

  const contextValue = {
    user,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 