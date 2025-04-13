"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/utils/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      setIsProfileLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setProfile(data);
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err);
      } finally {
        setIsProfileLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  // Get card and text color classes based on the current theme
  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        card: 'bg-white border-gray-200',
        title: 'text-gray-900',
        description: 'text-amber-700',
        text: 'text-gray-800',
        secondaryText: 'text-amber-700',
        border: 'border-gray-200'
      };
    }
    return {
      card: 'bg-black border-gray-800',
      title: 'text-white',
      description: 'text-yellow-400',
      text: 'text-white',
      secondaryText: 'text-yellow-400',
      border: 'border-gray-800'
    };
  };

  const classes = getThemeClasses();

  if (isLoading || isProfileLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className={classes.card}>
          <CardHeader>
            <CardTitle className={classes.title}>
              <Skeleton className={`h-8 w-1/3 ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
            </CardTitle>
            <CardDescription className={classes.description}>
              <Skeleton className={`h-4 w-1/4 ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className={`h-16 w-16 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
              <div className="space-y-2">
                <Skeleton className={`h-4 w-[250px] ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
                <Skeleton className={`h-4 w-[200px] ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className={`border-red-500 ${theme === 'light' ? 'bg-white' : 'bg-black'}`}>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription className={classes.description}>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <Card className={classes.card}>
          <CardHeader>
            <CardTitle className={classes.title}>Not Authenticated</CardTitle>
            <CardDescription className={classes.description}>Please login to view your profile</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="container mx-auto py-10">
      <Card className={classes.card}>
        <CardHeader>
          <CardTitle className={classes.title}>Profile</CardTitle>
          <CardDescription className={classes.description}>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className={`text-2xl font-medium ${classes.title}`}>{profile?.full_name || user.email}</h3>
              <p className={`text-sm ${classes.secondaryText}`}>{user.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className={`text-sm font-medium ${classes.title}`}>User ID</h4>
              <p className={`text-sm ${classes.secondaryText} break-all`}>{user.id}</p>
            </div>
            
            <div>
              <h4 className={`text-sm font-medium ${classes.title}`}>Last Updated</h4>
              <p className={`text-sm ${classes.secondaryText}`}>
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            
            {user.email_confirmed_at && (
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${theme === 'light' ? 'bg-red-700' : 'bg-red-500'}`}></div>
                <p className={`text-sm ${classes.secondaryText}`}>Email verified</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className={`flex justify-between items-center border-t ${classes.border} pt-4`}>
          <p className={`text-xs ${classes.secondaryText}`}>Theme preferences are saved automatically</p>
          <ThemeToggle />
        </CardFooter>
      </Card>
    </div>
  );
} 