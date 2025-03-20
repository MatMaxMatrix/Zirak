"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart,
  LogOut,
  User,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Logout function
function handleLogout() {
  // Clear the auth cookie
  document.cookie = "auth_user=; path=/; max-age=0";
  
  // Redirect to login page with success message
  window.location.href = "/login?success=logout";
}

export function Sidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    // Get user email from cookie
    setUserEmail(getCookie("auth_user"));
  }, []);
  
  // Determine if user is admin
  const isAdmin = userEmail === "admin@example.com";
  
  // Define navigation items
  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "LayoutDashboard",
    },
    {
      title: "Analytics",
      href: "/dashboard/analytics",
      icon: "BarChart",
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: "User",
    },
    // Admin-only items
    ...(isAdmin ? [
      {
        title: "Users",
        href: "/dashboard/users",
        icon: "Users",
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: "Settings",
      }
    ] : [])
  ];

  // Map icon names to actual icon components
  const iconMap: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
    BarChart: <BarChart className="h-4 w-4" />,
    Users: <Users className="h-4 w-4" />,
    User: <User className="h-4 w-4" />,
    ClipboardList: <ClipboardList className="h-4 w-4" />,
    Settings: <Settings className="h-4 w-4" />,
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold"
        >
          <span className="text-primary">My App</span>
        </Link>
      </div>

      <div className="flex flex-col items-center p-4 border-b">
        <div className="text-sm mb-1">Logged in as:</div>
        <div className="font-medium">{userEmail}</div>
        <div className="mt-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary">
          {isAdmin ? "Administrator" : "Regular User"}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
            )}
          >
            {iconMap[item.icon] || <div className="h-4 w-4" />}
            {item.title}
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <Button
          variant="outline"
          className="flex w-full items-center gap-2 px-3"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
