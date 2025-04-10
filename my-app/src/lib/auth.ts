/**
 * Auth utility functions for checking user roles and permissions
 */

import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * Check if a user has admin role
 * 
 * @param user The user object from Supabase
 * @returns boolean True if user has admin role
 */
export async function fetchUserRole(userId: string): Promise<string> {
  try {
    const supabase = createClient();
    
    // Check the user_roles table for the user's role
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user role:', error);
      return 'user'; // Default to regular user if there's an error
    }
    
    return data?.role || 'user';
  } catch (error) {
    console.error('Error in fetchUserRole:', error);
    return 'user'; // Default to regular user
  }
}

// Synchronous helper for UI components that can't use async functions directly
export function isAdmin(user: User | null): boolean {
  // Admin emails - define your admin emails here
  const adminEmails = [
    'admin@example.com', 
    'support@zirak.ai',
    // Add more admin emails as needed
  ];
  
  if (!user) return false;
  
  // Check if user's email is in the admin list
  return adminEmails.includes(user.email || '');
}

/**
 * Get user role
 * 
 * @param user The user object from Supabase
 * @returns string User's role
 */
export function getUserRole(user: any): string {
  if (!user) return 'user';
  
  // Check for role in user_roles table
  if (user.role) {
    return user.role;
  }
  
  // Default to user role
  return 'user';
} 