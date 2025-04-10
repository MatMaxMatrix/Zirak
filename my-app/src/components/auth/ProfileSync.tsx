'use client';

import { useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import { createClient } from '@/utils/supabase/client';

export function ProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    
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
            // No profile found, this is expected for new users
            console.log('No profile found for user, creating new profile via API');
            
            try {
              // Create profile via API route (with admin privileges)
              const response = await fetch('/api/profile/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  email: user.email,
                  name: user.user_metadata?.name || '',
                  picture: user.user_metadata?.picture || '',
                }),
                cache: 'no-store', // Prevent caching
              });
              
              // Get response text once and handle it
              let responseText = '';
              try {
                responseText = await response.text();
              } catch (e) {
                console.error('Error getting response text:', e);
              }
              
              // Check if response is OK
              if (!response.ok) {
                console.error('API Error response:', response.status, responseText || '(empty response)');
                return;
              }
              
              // Handle empty responses
              if (!responseText || responseText.trim() === '') {
                console.log('Profile API returned empty response, but status was OK');
                return;
              }
              
              try {
                const result = JSON.parse(responseText);
                if (isMounted) {
                  console.log('Profile creation response:', result.message);
                }
              } catch (jsonError) {
                console.error('JSON parse error:', jsonError, 'Raw response:', responseText);
              }
            } catch (fetchError) {
              console.error('Fetch error creating profile:', 
                fetchError instanceof Error ? fetchError.message : String(fetchError));
            }
          } else {
            console.error('Error fetching profile:', JSON.stringify(error));
          }
        } else {
          console.log('User profile exists:', profile.email);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error syncing profile:', 
            error instanceof Error ? error.message : String(error));
        }
      }
    };

    syncProfile();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  return null; // This component doesn't render anything
} 