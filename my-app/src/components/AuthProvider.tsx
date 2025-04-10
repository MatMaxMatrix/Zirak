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
    
    // Throttle refreshes to once every second
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 1000) {
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
      
      // Only update if we got a user back and it's different from current
      if (data.user) {
        // Update the user state, merging with any existing state to prevent lost data
        setUser(prevUser => {
          // If same user ID, merge the data to preserve any fields that might not be in the new data
          if (prevUser?.id === data.user?.id) {
            return {
              ...prevUser,
              ...data.user,
              // Ensure user_metadata is merged correctly
              user_metadata: {
                ...(prevUser?.user_metadata || {}),
                ...(data.user?.user_metadata || {})
              }
            };
          }
          // Different user (or null before), use the new data
          return data.user;
        });
      }
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

    // Get initial session and user data
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthProvider] Session error:", error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (session) {
          console.log("[AuthProvider] Initial session found:", session.user?.email);
          
          // Get the user with their full metadata
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("[AuthProvider] User data error:", userError);
          } else if (userData.user) {
            console.log("[AuthProvider] User data loaded:", userData.user.email);
            if (mounted) {
              setUser(userData.user);
            }
          }
        } else {
          console.log("[AuthProvider] No session found");
        }
        
        if (mounted) {
          setIsLoading(false);
          authCheckRef.current = true;
        }
      } catch (err) {
        console.error("[AuthProvider] Session initialization error:", err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (!authCheckRef.current) {
      initializeSession();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      console.log("[AuthProvider] Auth state changed:", event, session?.user?.email);
      
      // Debounce state updates to prevent rapid changes
      debounceTimer = setTimeout(async () => {
        // Handle different auth events appropriately
        switch (event) {
          case 'SIGNED_IN':
            // When signed in, get the full user object to ensure we have all metadata
            try {
              const { data, error } = await supabase.auth.getUser();
              if (error) {
                console.error("[AuthProvider] Error getting user after sign-in:", error);
              } else if (data.user) {
                console.log("[AuthProvider] User data after sign-in:", data.user.email);
                setUser(data.user);
              }
            } catch (err) {
              console.error("[AuthProvider] Error in SIGNED_IN handling:", err);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log("[AuthProvider] User signed out");
            setUser(null);
            break;
            
          case 'TOKEN_REFRESHED':
            // Refresh the user data when token is refreshed
            refreshUser();
            break;
            
          case 'USER_UPDATED':
            // When user is updated, get the latest data
            try {
              const { data, error } = await supabase.auth.getUser();
              if (error) {
                console.error("[AuthProvider] Error getting user after update:", error);
              } else if (data.user) {
                console.log("[AuthProvider] User data after update:", data.user.email);
                setUser(data.user);
              }
            } catch (err) {
              console.error("[AuthProvider] Error in USER_UPDATED handling:", err);
            }
            break;
            
          default:
            // For other events, just update with session data if available
            if (session?.user && event !== 'INITIAL_SESSION') {
              setUser(session.user);
              setIsLoading(false);
            }
        }
      }, 100);
    });

    // Add a visibility change listener to refresh user data when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log("[AuthProvider] Page became visible, refreshing user data");
        // Don't refresh immediately to prevent rapid changes
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          refreshUser();
        }, 500);
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
  }, [refreshUser, user]);

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