'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
  X,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  LaptopIcon,
  UserIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from './ui/dropdown-menu';
import { usePathname, useRouter } from 'next/navigation';
import { useFileSystem } from '@/hooks/useFileSystem';
import dynamic from 'next/dynamic';
import { isAdmin } from '@/lib/auth';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';
import { useTheme } from 'next-themes';

// Dynamically import the ProjectSelector to avoid circular dependencies
const DynamicProjectSelector = dynamic(
  () => import('@/components/chat/ProjectSelector').then(mod => ({ default: mod.ProjectSelector })),
  { ssr: false }
);

// User dropdown component for when the user is logged in
const UserDropdown = ({ user, onSignOut }) => {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  
  useEffect(() => {
    // Fetch profile data for the user
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          console.log('[NavBar] Profile data loaded:', data.email);
          setProfileData(data);
        }
      } catch (error) {
        console.error('[NavBar] Error fetching profile:', error);
      }
    };
    
    fetchProfileData();
  }, [user]);
  
  const goToProfile = () => {
    router.push('/user-dashboard/profile');
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profileData?.picture || user.user_metadata?.avatar_url || user.user_metadata?.picture} alt={user.email} />
            <AvatarFallback>{profileData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profileData?.name || user.user_metadata?.name || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={goToProfile}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/user-dashboard')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/contact')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Contact Us</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Theme
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <LaptopIcon className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Mobile theme toggle component
const MobileThemeToggle = () => {
  const { setTheme } = useTheme();
  
  return (
    <div className="px-3 py-2">
      <div className="text-base font-medium text-gray-500 mb-1">Theme</div>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => setTheme("light")}
          className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-50"
        >
          <Sun className="h-5 w-5 mb-1" />
          <span className="text-xs">Light</span>
        </button>
        <button 
          onClick={() => setTheme("dark")}
          className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-50"
        >
          <Moon className="h-5 w-5 mb-1" />
          <span className="text-xs">Dark</span>
        </button>
        <button 
          onClick={() => setTheme("system")}
          className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-gray-50"
        >
          <LaptopIcon className="h-5 w-5 mb-1" />
          <span className="text-xs">System</span>
        </button>
      </div>
    </div>
  );
};

const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const fileSystem = useFileSystem();
  const [profileData, setProfileData] = useState(null);
  
  // Check if we're on the chat page
  const isChatPage = pathname?.startsWith('/chat');

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[NavBar] Initial session:", session?.user?.email);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[NavBar] Auth state changed:", session?.user?.email);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile data when user changes
  useEffect(() => {
    // Fetch profile data for the user
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (!error && data) {
          console.log('[NavBar] Main Nav Profile data loaded:', data.email);
          setProfileData(data);
        }
      } catch (error) {
        console.error('[NavBar] Error fetching profile in main nav:', error);
      }
    };
    
    fetchProfileData();
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-transparent backdrop-blur-sm border-b border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between h-16">
          {/* Left side with logo and project selector */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold">
                Zirak AI Assistant
              </Link>
              
              {/* Project selector for chat page */}
              {isChatPage && (
                <div className="flex items-center">
                  <span className="ml-4 text-gray-500">/</span>
                  <div className="ml-4">
                    <DynamicProjectSelector 
                      currentProject={fileSystem.currentProject} 
                      onSelect={fileSystem.handleProjectSelect}
                      onCreateProject={fileSystem.handleCreateProject}
                      onConfigureProject={fileSystem.refreshFileSystem}
                      navbarMode={true}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Center navigation links - hidden on small screens */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Home
              </Link>
              <Link href="/features" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Features
              </Link>
              <Link href="/pricing" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Pricing
              </Link>
              <Link href="/contact" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Contact
              </Link>
            </div>
          </div>
          
          {/* Right side with user controls */}
          <div className="flex items-center justify-end">
            {user && (
              <div className="hidden md:flex mr-4">
                <Link href="/user-dashboard" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium mr-4">
                  My Dashboard
                </Link>
                {/* Show admin dashboard link only if user is an admin */}
                {isAdmin(user) && (
                  <Link href="/admin-dashboard" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Admin Dashboard
                  </Link>
                )}
              </div>
            )}
          
            <div className="hidden sm:flex sm:items-center">
              {!isLoading && (
                <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700 mr-4">
                  <Link href="/waitlist">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Join Waitlist
                  </Link>
                </Button>
              )}
              
              {!isLoading && !user && (
                <Button asChild variant="outline">
                  <Link href="/sign-in">
                    Sign in
                  </Link>
                </Button>
              )}
              
              {user && <UserDropdown user={user} onSignOut={handleSignOut} />}
            </div>
          </div>
          
          <div className="flex items-center sm:hidden absolute right-4 top-1/2 transform -translate-y-1/2">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden" id="mobile-menu">
          {/* Project selector for mobile on chat page */}
          {isChatPage && (
            <div className="px-3 py-2 border-b border-gray-200">
              <div className="flex items-center">
                <span className="text-xs font-medium text-gray-500">Project:</span>
                <DynamicProjectSelector 
                  currentProject={fileSystem.currentProject} 
                  onSelect={fileSystem.handleProjectSelect}
                  onCreateProject={fileSystem.handleCreateProject}
                  onConfigureProject={fileSystem.refreshFileSystem}
                  navbarMode={true}
                />
              </div>
            </div>
          )}
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className="bg-indigo-50 border-indigo-500 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Home
            </Link>
            <Link href="/features" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Features
            </Link>
            <Link href="/pricing" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Pricing
            </Link>
            <Link href="/contact" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              Contact
            </Link>
            {user && (
              <>
                <Link href="/user-dashboard" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  My Dashboard
                </Link>
                {/* Show admin dashboard link only if user is an admin */}
                {isAdmin(user) && (
                  <Link href="/admin-dashboard" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                    Admin Dashboard
                  </Link>
                )}
              </>
            )}
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200">
            {!isLoading && !user && (
              <div className="mt-3 px-2 space-y-1">
                <Button asChild className="w-full mb-2 bg-blue-600 hover:bg-blue-700">
                  <Link href="/waitlist">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Join Waitlist
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/sign-in">
                    Sign in
                  </Link>
                </Button>
              </div>
            )}
            
            {user && (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profileData?.picture || user.user_metadata?.avatar_url || user.user_metadata?.picture} alt={user.email} />
                      <AvatarFallback>{profileData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{profileData?.name || user.user_metadata?.name || user.email}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  <Link 
                    href="/user-dashboard/profile" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Your Profile
                    </div>
                  </Link>
                  <Link 
                    href="/user-dashboard" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Dashboard
                    </div>
                  </Link>
                  <Link 
                    href="/contact" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <div className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact Us
                    </div>
                  </Link>
                  <MobileThemeToggle />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <div className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar; 