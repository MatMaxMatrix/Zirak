"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/utils/supabase/client";
import {
  User,
  CreditCard,
  Home,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth"; // Import the isAdmin utility function

// Logout function
async function handleLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/";
}

export function UserSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userEmail = user?.email;
  // Check if user is admin
  const userIsAdmin = user ? isAdmin(user) : false;

  // Define navigation items for regular users
  const navItems = [
    {
      title: "Overview",
      href: "/user-dashboard",
      icon: "Home",
    },
    {
      title: "Profile",
      href: "/user-dashboard/profile",
      icon: "User",
    },
    {
      title: "Billing",
      href: "/user-dashboard/billing",
      icon: "CreditCard",
    }
  ];

  // Map icon names to actual icon components
  const iconMap: Record<string, React.ReactNode> = {
    Home: <Home className="h-4 w-4" />,
    User: <User className="h-4 w-4" />,
    CreditCard: <CreditCard className="h-4 w-4" />,
  };

  return (
    <aside className="fixed top-16 left-0 z-20 flex h-[calc(100vh-4rem)] w-64 flex-col border-r bg-background shadow-sm">
      <div className="flex flex-col items-center p-4 border-b">
        <div className="text-sm mb-1">Welcome back!</div>
        <div className="font-medium">{userEmail}</div>
        <div className="mt-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary">
          {userIsAdmin ? "Administrator" : "Regular User"}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
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