/**
 * Auth utility functions for checking user roles and permissions
 */

// The namespace used for Auth0 custom claims
const ROLES_NAMESPACE = 'https://example.com/roles';
// Alternative namespace from your Auth0 action
const ALT_ROLES_NAMESPACE = 'https://your-app-domain.com/roles';

/**
 * Check if a user has admin role
 * This is a centralized function to consistently check admin status
 * 
 * @param user The Auth0 user object
 * @returns boolean True if user has admin role
 */
export function isAdmin(user: any): boolean {
  if (!user) return false;
  
  console.log("Checking admin status for user:", user.email);
  
  // Method 1: Check for roles in the main namespace
  const roles = user[ROLES_NAMESPACE];
  if (Array.isArray(roles) && roles.includes('admin')) {
    console.log("Admin found in main namespace");
    return true;
  }
  
  // Method 2: Check for roles in the alternative namespace
  const altRoles = user[ALT_ROLES_NAMESPACE];
  if (Array.isArray(altRoles) && altRoles.includes('admin')) {
    console.log("Admin found in alt namespace");
    return true;
  }
  
  // Method 3: Check for Hasura-specific role claim
  if (user['x-hasura-default-role'] === 'admin') {
    console.log("Admin found in x-hasura-default-role");
    return true;
  }
  
  // Method 4: Check for roles directly (some Auth0 configurations)
  if (Array.isArray(user.roles) && user.roles.includes('admin')) {
    console.log("Admin found in user.roles");
    return true;
  }
  
  // Method 5: Check for direct is_admin flag
  if (user.is_admin === true) {
    console.log("Admin found via is_admin flag");
    return true;
  }
  
  // Method 6: Fallback to checking email (temporary until proper roles are set up)
  // Remove this in production when roles are properly configured
  if (user.email === 'admin@example.com' || user.email === 'azimipanah.mobin@gmail.com') {
    console.log("Admin found via email");
    return true;
  }
  
  console.log("No admin role found");
  return false;
}

/**
 * Get user roles from Auth0 user
 * 
 * @param user The Auth0 user object 
 * @returns string[] Array of role names
 */
export function getUserRoles(user: any): string[] {
  if (!user) return [];
  
  // Collect all possible roles from different sources
  const allRoles = new Set<string>();
  
  // Try to get roles from main namespace
  const namespacedRoles = user[ROLES_NAMESPACE];
  if (Array.isArray(namespacedRoles)) {
    namespacedRoles.forEach((role: string) => allRoles.add(role));
  }
  
  // Try to get roles from alternative namespace
  const altNamespacedRoles = user[ALT_ROLES_NAMESPACE];
  if (Array.isArray(altNamespacedRoles)) {
    altNamespacedRoles.forEach((role: string) => allRoles.add(role));
  }
  
  // Try to get roles from Hasura claims
  const hasuraRoles = user['x-hasura-allowed-roles'];
  if (Array.isArray(hasuraRoles)) {
    hasuraRoles.forEach((role: string) => allRoles.add(role));
  }
  
  // Try to get roles directly
  if (Array.isArray(user.roles)) {
    user.roles.forEach((role: string) => allRoles.add(role));
  }
  
  // Fallback for development
  if (user.email === 'admin@example.com' || user.email === 'azimipanah.mobin@gmail.com') {
    allRoles.add('admin');
  }
  
  return Array.from(allRoles);
} 