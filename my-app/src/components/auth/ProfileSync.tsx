'use client';

import { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getSupabase } from '@/utils/supabase';

export function ProfileSync() {
  const { user, isLoading: isAuth0Loading } = useUser();

  useEffect(() => {
    async function syncProfile() {
      if (!user || isAuth0Loading) return;
      
      try {
        console.log('Starting profile sync for user:', user.sub);
        
        // Create Supabase client with Auth0 token
        const supabase = getSupabase(user.accessToken as string | undefined);
        
        // Check if profile exists
        console.log('Checking for existing profile with ID:', user.sub);
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.sub)
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error checking for existing profile:', fetchError);
          return;
        }

        // Prepare user data with more fields
        const userData = {
          id: user.sub,
          email: user.email,
          username: user.nickname || user.email?.split('@')[0] || user.sub,
          full_name: user.name,
          avatar_url: user.picture,
          updated_at: new Date().toISOString(),
        };

        console.log('User data prepared:', userData);

        if (!existingProfile) {
          // Create new profile with additional fields
          console.log('Creating new profile for user:', user.sub);
          const { data, error } = await supabase
            .from('profiles')
            .insert([{
              ...userData,
              created_at: new Date().toISOString(),
            }])
            .select();
            
          if (error) {
            console.error('Error creating profile:', error);
          } else {
            console.log('Profile created successfully:', data);
          }
        } else {
          // Update existing profile with all fields
          console.log('Updating existing profile for user:', user.sub);
          const { data, error } = await supabase
            .from('profiles')
            .update(userData)
            .eq('id', user.sub)
            .select();
            
          if (error) {
            console.error('Error updating profile:', error);
          } else {
            console.log('Profile updated successfully:', data);
          }
        }
      } catch (error) {
        console.error('Error syncing profile:', error);
      }
    }

    syncProfile();
  }, [user, isAuth0Loading]);

  return null; // This component doesn't render anything
} 