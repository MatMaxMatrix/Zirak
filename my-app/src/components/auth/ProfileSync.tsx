'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { createClient } from '@/utils/supabase/client';

type ProfileData = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  bio: string | null;
  phone_number: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
};

export function ProfileSync() {
  const { user, refreshUser } = useAuth();
  const [lastSyncId, setLastSyncId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Prevent duplicate syncs for the same user
    if (lastSyncId === user.id) return;
    
    let isMounted = true;
    console.log("[ProfileSync] Starting profile sync for:", user.email);
    
    const syncProfile = async () => {
      try {
        const supabase = createClient();
        
        // Get the user's profile from the profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found, create a new profile with metadata from auth
            console.log('[ProfileSync] No profile found, creating new profile');
            
            try {
              // Create profile via API route with admin privileges
              const response = await fetch('/api/profile/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                  picture: user.user_metadata?.picture || user.user_metadata?.avatar_url || '',
                }),
                cache: 'no-store',
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('[ProfileSync] Profile creation failed:', response.status, errorText);
                return;
              }
              
              const result = await response.json();
              if (isMounted) {
                console.log('[ProfileSync] Profile created successfully:', result.message);
                setLastSyncId(user.id);
                // Refresh the user to get updated session data
                await refreshUser();
              }
            } catch (fetchError) {
              console.error('[ProfileSync] Fetch error creating profile:', 
                fetchError instanceof Error ? fetchError.message : String(fetchError));
            }
          } else {
            console.error('[ProfileSync] Error fetching profile:', error);
          }
        } else {
          console.log('[ProfileSync] User profile exists:', profile.email);
          
          // Check if there are differences between auth metadata and profile data
          // that need to be synchronized
          const needsUpdate = checkProfileSyncNeeded(user, profile);
          
          if (needsUpdate) {
            console.log('[ProfileSync] Updating profile with latest auth data');
            
            try {
              const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || user.user_metadata?.full_name || profile.name,
                  picture: user.user_metadata?.picture || user.user_metadata?.avatar_url || profile.picture,
                }),
                cache: 'no-store',
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('[ProfileSync] Profile update failed:', response.status, errorText);
                return;
              }
              
              const result = await response.json();
              if (isMounted) {
                console.log('[ProfileSync] Profile updated successfully:', result.message);
                setLastSyncId(user.id);
                // Refresh user to ensure session has latest data
                await refreshUser();
              }
            } catch (fetchError) {
              console.error('[ProfileSync] Fetch error updating profile:', 
                fetchError instanceof Error ? fetchError.message : String(fetchError));
            }
          } else {
            // No update needed, still mark as synced
            setLastSyncId(user.id);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('[ProfileSync] Error syncing profile:', 
            error instanceof Error ? error.message : String(error));
        }
      }
    };

    syncProfile();
    
    return () => {
      isMounted = false;
    };
  }, [user, refreshUser, lastSyncId]);

  // Helper function to check if profile sync is needed
  function checkProfileSyncNeeded(user: any, profile: ProfileData): boolean {
    if (!user || !profile) return false;
    
    // Check if auth metadata has more updated info than profile
    const authName = user.user_metadata?.name || user.user_metadata?.full_name || '';
    const authPicture = user.user_metadata?.picture || user.user_metadata?.avatar_url || '';
    
    return (
      (authName && authName !== profile.name) || 
      (authPicture && authPicture !== profile.picture)
    );
  }

  return null; // This component doesn't render anything
} 