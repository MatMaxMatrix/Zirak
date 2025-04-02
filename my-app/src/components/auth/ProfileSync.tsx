'use client';

import { useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useSupabaseClient } from '@/lib/supabase';

export function ProfileSync() {
  const { user, isLoading: isAuth0Loading } = useUser();
  const { supabase, isLoading: isSupabaseLoading } = useSupabaseClient();

  useEffect(() => {
    async function syncProfile() {
      if (!user || isAuth0Loading || isSupabaseLoading) return;

      try {
        const supabaseClient = await supabase;
        
        // Check if profile exists
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select()
          .eq('id', user.sub)
          .single();

        if (!existingProfile) {
          // Create new profile
          await supabaseClient.from('profiles').insert([
            {
              id: user.sub,
              username: user.email?.split('@')[0] || user.sub,
              avatar_url: user.picture,
              updated_at: new Date().toISOString(),
            },
          ]);
        } else {
          // Update existing profile
          await supabaseClient
            .from('profiles')
            .update({
              username: user.email?.split('@')[0] || user.sub,
              avatar_url: user.picture,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.sub);
        }
      } catch (error) {
        console.error('Error syncing profile:', error);
      }
    }

    syncProfile();
  }, [user, isAuth0Loading, isSupabaseLoading, supabase]);

  return null; // This component doesn't render anything
} 