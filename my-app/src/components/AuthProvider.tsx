'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

// Extend the Supabase User type to include our custom role
export interface UserWithRole extends User {
  role?: string; // Add role as an optional string
}

interface AuthContextType {
  user: UserWithRole | null; // Use the extended type
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null); // Use the extended type
  const [isLoading, setIsLoading] = useState(true);
  const authCheckRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);
  const lastRefreshTimeRef = useRef<number>(0);

  // Helper function to fetch user data including role
  const fetchUserWithRole = useCallback(async (supabaseUser: User): Promise<UserWithRole | null> => {
    if (!supabaseUser) return null;

    let userWithRole: UserWithRole = { ...supabaseUser, role: 'user' }; // Default role

    try {
      const supabase = createClient();
      console.log(`[AuthProvider] Fetching role for user: ${supabaseUser.id}`);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .single(); // Expecting only one role entry per user

      if (roleError && roleError.code !== 'PGRST116') { // Ignore "No rows found" error (PGRST116)
        console.error("[AuthProvider] Error fetching user role:", roleError);
        // Keep default role 'user'
      } else if (roleData) {
        console.log(`[AuthProvider] Found role: ${roleData.role} for user: ${supabaseUser.id}`);
        userWithRole.role = roleData.role;
      }
    } catch (e) {
      console.error("[AuthProvider] Exception fetching user role:", e);
      // Keep default role 'user' on exception
    }
    return userWithRole;
  }, []);

  // Function to refresh user data when needed with throttling
  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) {
      console.log("[AuthProvider] Refresh already in progress, skipping");
      return;
    }
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 1000) {
      console.log("[AuthProvider] Refresh throttled");
      return;
    }
    
    try {
      refreshingRef.current = true;
      lastRefreshTimeRef.current = now;
      
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("[AuthProvider] Error refreshing auth user:", error);
        return;
      }
      
      if (authData.user) {
        const refreshedUserWithRole = await fetchUserWithRole(authData.user);
        if (refreshedUserWithRole) {
          console.log("[AuthProvider] User refreshed:", refreshedUserWithRole.email, "Role:", refreshedUserWithRole.role);
          setUser(refreshedUserWithRole);
        }
      } else {
         setUser(null); // Clear user if refresh returns no user
      }
    } catch (err) {
      console.error("[AuthProvider] Refresh error:", err);
    } finally {
      refreshingRef.current = false;
    }
  }, [fetchUserWithRole]); // Add fetchUserWithRole dependency

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let debounceTimer: NodeJS.Timeout | null = null;
    let authStateChangeCount = 0;

    // Function to process user data (fetch role and set state)
    const processUser = async (supabaseUser: User | null) => {
      if (!mounted) return;
      if (supabaseUser) {
        const userWithRoleData = await fetchUserWithRole(supabaseUser);
        setUser(userWithRoleData);
      } else {
        setUser(null);
      }
      if (mounted) {
         setIsLoading(false); // Set loading false after processing
      }
    };

    // Get initial session and user data
    const initializeSession = async () => {
      try {
        // First get session, then get user which might include more metadata initially
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[AuthProvider] Session error:", sessionError);
          processUser(null);
          return;
        }
        
        if (session) {
          console.log("[AuthProvider] Initial session found for:", session.user?.email);
          // Get the user object again to ensure latest data/metadata
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error("[AuthProvider] Error getting user data on init:", userError);
            processUser(session.user); // Fallback to session user if getUser fails
          } else {
            processUser(userData.user); // Process user with full data
          }
        } else {
          console.log("[AuthProvider] No initial session found");
          processUser(null);
        }
        
        if (mounted) {
          authCheckRef.current = true;
        }
      } catch (err) {
        console.error("[AuthProvider] Session initialization error:", err);
        processUser(null);
      }
    };

    if (!authCheckRef.current) {
      initializeSession();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Limit excessive auth state change logging to avoid cluttering the console
      authStateChangeCount++;
      if (authStateChangeCount <= 2 || authStateChangeCount % 5 === 0) {
        console.log("[AuthProvider] Auth state changed:", event, session?.user?.email);
      }
      
      // For INITIAL_SESSION events when we already have a user, don't re-process
      if (event === 'INITIAL_SESSION' && user !== null) {
        return;
      }
      
      // Debounce state updates
      debounceTimer = setTimeout(async () => {
        switch (event) {
          case 'SIGNED_IN':
          case 'USER_UPDATED':
            // Fetch full user data including role
             if (session?.user) {
               processUser(session.user);
             } else {
               // If session is somehow null, try fetching directly
               const { data: { user: currentUser } } = await supabase.auth.getUser();
               processUser(currentUser);
             }
            break;
            
          case 'SIGNED_OUT':
            processUser(null);
            break;
            
          case 'TOKEN_REFRESHED':
            // Only refresh user data if session exists
            if (session?.user) {
              // Don't necessarily need to processUser here unless role might change 
              // on token refresh, which is unlikely. A simple refresh might suffice.
              refreshUser(); 
            } else {
              // If token refreshed but session is null, treat as signed out
              processUser(null);
            }
            break;
            
          default:
             // For other events (like INITIAL_SESSION, PASSWORD_RECOVERY), 
             // just update with session data if available, which processUser handles.
             // Skip if it's a repeat of the same event with the same user
             if (event === 'INITIAL_SESSION' && user?.id === session?.user?.id) {
               // Skip processing if this is a duplicate INITIAL_SESSION for the same user
               return;
             }
             processUser(session?.user ?? null);
        }
      }, 100); // 100ms debounce
    });

    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log("[AuthProvider] Page became visible, refreshing user data");
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
  }, [fetchUserWithRole, refreshUser, user]); // Added fetchUserWithRole and user dependencies

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