// Define roles and permissions for the application

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MANAGER = 'manager',
}

export type Permission =
  | 'dashboard:view'
  | 'analytics:view'
  | 'analytics:export'
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'profile:view'
  | 'profile:edit'
  | 'settings:view'
  | 'settings:edit'
  | 'settings:advanced'
  | 'settings:billing';

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'dashboard:view',
    'analytics:view',
    'analytics:export',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'profile:view',
    'profile:edit',
    'settings:view',
    'settings:edit',
    'settings:advanced',
    'settings:billing',
  ],
  [UserRole.MANAGER]: [
    'dashboard:view',
    'analytics:view',
    'analytics:export',
    'users:view',
    'users:create',
    'users:edit',
    'profile:view',
    'profile:edit',
    'settings:view',
    'settings:edit',
  ],
  [UserRole.USER]: [
    'dashboard:view',
    'profile:view',
    'profile:edit',
    'settings:view',
  ],
};

// Permitted routes for each role
export const roleRoutes: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    '/dashboard',
    '/dashboard/analytics',
    '/dashboard/users',
    '/dashboard/profile',
    '/dashboard/settings',
    '/dashboard/activity',
  ],
  [UserRole.MANAGER]: [
    '/dashboard',
    '/dashboard/analytics',
    '/dashboard/users',
    '/dashboard/profile',
    '/dashboard/settings',
  ],
  [UserRole.USER]: [
    '/dashboard',
    '/dashboard/profile',
    '/dashboard/settings',
  ],
};

// Type for navigation items
interface NavItem {
  title: string;
  href: string;
  icon: string;
}

// Nav items for sidebar based on role
export const getNavItemsByRole = (role: string): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "LayoutDashboard",
    },
  ];

  if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
    baseItems.push(
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: "BarChart",
      },
      {
        title: "Users",
        href: "/dashboard/users",
        icon: "Users",
      }
    );
  }

  if (role === UserRole.ADMIN) {
    baseItems.push({
      title: "Activity Logs",
      href: "/dashboard/activity",
      icon: "ClipboardList",
    });
  }

  // All roles have access to these
  baseItems.push(
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: "User",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "Settings",
    }
  );

  return baseItems;
};

// Check if a user has a specific permission
export const hasPermission = (userRole: string, permission: Permission): boolean => {
  if (!userRole || !Object.values(UserRole).includes(userRole as UserRole)) {
    return false;
  }

  return rolePermissions[userRole as UserRole].includes(permission);
};

// Check if a user has access to a specific route
export const hasRouteAccess = (userRole: string, route: string): boolean => {
  if (!userRole || !Object.values(UserRole).includes(userRole as UserRole)) {
    return false;
  }

  return roleRoutes[userRole as UserRole].some(allowedRoute =>
    route === allowedRoute ||
    (allowedRoute.endsWith('*') && route.startsWith(allowedRoute.slice(0, -1)))
  );
};

// Utility to get user role label
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.USER:
      return 'User';
    default:
      return 'Guest';
  }
};

// Function to check if a user has a specific role
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  // If checking for USER role, any authenticated user passes
  if (requiredRole === UserRole.USER) return true;
  
  // For admin role, only admin can access
  if (requiredRole === UserRole.ADMIN) return userRole === UserRole.ADMIN;
  
  // For manager role, both admin and manager can access
  if (requiredRole === UserRole.MANAGER) 
    return userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
  
  return false;
};

// Function to get role display name
export const getRoleName = (role: string | undefined): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrator';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.USER:
      return 'User';
    default:
      return 'Guest';
  }
};

export default {
  UserRole,
  hasRole,
  getRoleName
};
