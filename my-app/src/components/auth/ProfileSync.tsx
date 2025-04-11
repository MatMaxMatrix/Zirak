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
        
        // Try using RPC function first (with proper type handling)
        const { data: profileData, error: rpcError } = await supabase.rpc('get_profile_by_id', {
          p_user_id: user.id
        });
        
        if (rpcError) {
          console.log('RPC not available, falling back to direct query:', rpcError.message);
          
          // Use direct query with eq now that types match
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          handleProfileData(profile, error);
        } else if (profileData) {
          // If we got profile data from the RPC, it means the profile exists
          console.log('[ProfileSync] User profile exists (via RPC):', profileData.email);
          
          // Convert JSON data to ProfileData type
          const profile: ProfileData = {
            id: profileData.id,
            email: profileData.email,
            name: profileData.name,
            picture: profileData.picture,
            bio: profileData.bio,
            phone_number: profileData.phone_number,
            city: profileData.city,
            created_at: profileData.created_at,
            updated_at: profileData.updated_at
          };
          
          // Check if sync needed and handle it
          const needsUpdate = checkProfileSyncNeeded(user, profile);
          
          if (needsUpdate) {
            await updateProfile(user, profile);
          } else {
            // No update needed, still mark as synced
            setLastSyncId(user.id);
          }
        } else {
          // No profile found, create a new one
          console.log('[ProfileSync] No profile found (via RPC), creating new profile');
          await createNewProfile(user);
        }
      } catch (error) {
        if (isMounted) {
          console.error('[ProfileSync] Error syncing profile:', 
            error instanceof Error ? error.message : String(error));
        }
      }
    };
    
    // Helper function to handle profile data from direct query
    const handleProfileData = async (profile: any, error: any) => {
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create a new profile with metadata from auth
          console.log('[ProfileSync] No profile found, creating new profile');
          await createNewProfile(user);
        } else {
          console.error('[ProfileSync] Error fetching profile:', error);
        }
      } else {
        console.log('[ProfileSync] User profile exists:', profile.email);
        
        // Check if there are differences between auth metadata and profile data
        // that need to be synchronized
        const needsUpdate = checkProfileSyncNeeded(user, profile);
        
        if (needsUpdate) {
          await updateProfile(user, profile);
        } else {
          // No update needed, still mark as synced
          setLastSyncId(user.id);
        }
      }
    };
    
    // Helper function to create a new profile
    const createNewProfile = async (user: any) => {
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
    };
    
    // Helper function to update a profile
    const updateProfile = async (user: any, profile: ProfileData) => {
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