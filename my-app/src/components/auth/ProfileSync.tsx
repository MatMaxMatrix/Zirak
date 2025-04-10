'use client';

import { useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import { createClient } from '@/utils/supabase/client';

export function ProfileSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

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
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              console.error('API Error creating profile:', result.error);
            } else {
              console.log('Profile creation response:', result.message);
            }
          } else {
            console.error('Error fetching profile:', JSON.stringify(error));
          }
        } else {
          console.log('User profile exists:', profile.email);
        }
      } catch (error) {
        console.error('Error syncing profile:', error instanceof Error ? error.message : String(error));
      }
    };

    syncProfile();
  }, [user]);

  return null; // This component doesn't render anything
} 