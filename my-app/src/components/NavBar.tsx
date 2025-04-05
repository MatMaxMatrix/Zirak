'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
  X,
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import { useFileSystem } from '@/hooks/useFileSystem';
import dynamic from 'next/dynamic';
import { isAdmin } from '@/lib/auth';

// Dynamically import the ProjectSelector to avoid circular dependencies
const DynamicProjectSelector = dynamic(
  () => import('@/components/chat/ProjectSelector').then(mod => ({ default: mod.ProjectSelector })),
  { ssr: false }
);

const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const fileSystem = useFileSystem();
  
  // Check if we're on the chat page
  const isChatPage = pathname?.startsWith('/chat');

  return (
    <nav className="bg-background border-b">
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
                  <span className="text-gray-400 mx-2">&gt;</span>
                  <div className="flex items-center px-2 py-1 rounded bg-[#262626] border border-[#333333]">
                    <span className="hidden xs:inline-block text-xs text-gray-400 mr-1">Select Project:</span>
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
              <Link href="/about" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                About
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
                  <Link href="/admin/dashboard" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    Admin Dashboard
                  </Link>
                )}
              </div>
            )}
          
            <div className="hidden sm:flex sm:items-center">
              {!isLoading && (
                <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700 mr-4">
                  <Link href="/chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with AI
                  </Link>
                </Button>
              )}
              
              {!isLoading && !user && (
                <Button asChild variant="outline">
                  <Link href="/api/auth/login?prompt=login">
                    Login
                  </Link>
                </Button>
              )}
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.picture || ""} alt={user.name || "User"} />
                        <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {user.name && <p className="font-medium">{user.name}</p>}
                        {user.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/user-dashboard/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/api/auth/logout" className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            <Link href="/about" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
              About
            </Link>
            {user && (
              <>
                <Link href="/user-dashboard" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
                  My Dashboard
                </Link>
                {/* Show admin dashboard link only if user is an admin */}
                {isAdmin(user) && (
                  <Link href="/admin/dashboard" className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
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
                  <Link href="/chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with AI
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/api/auth/login?prompt=login">
                    Login
                  </Link>
                </Button>
              </div>
            )}
            
            {user && (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.picture || ""} alt={user.name || "User"} />
                      <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <Button asChild className="w-full mb-2 bg-blue-600 hover:bg-blue-700">
                    <Link href="/chat">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat with AI
                    </Link>
                  </Button>
                  <Link href="/user-dashboard/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    Profile
                  </Link>
                  <Link href="/api/auth/logout" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    Log out
                  </Link>
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