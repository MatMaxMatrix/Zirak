'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Users, CreditCard, ChevronsUpDown, 
  Settings, Shield, BarChart 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';

interface AdminNavProps {
  className?: string;
}

export function AdminNav({ className }: AdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  
  const activeTab = searchParams.get('tab') || 'overview';
  
  const navItems = [
    {
      title: 'Overview',
      href: '/admin-dashboard',
      icon: <BarChart className="mr-2 h-4 w-4" />,
      tabValue: 'overview'
    },
    {
      title: 'Users',
      href: '/admin-dashboard?tab=users',
      icon: <Users className="mr-2 h-4 w-4" />,
      tabValue: 'users'
    },
    {
      title: 'Subscriptions',
      href: '/admin-dashboard?tab=subscriptions',
      icon: <CreditCard className="mr-2 h-4 w-4" />,
      tabValue: 'subscriptions'
    },
    {
      title: 'Activity',
      href: '/admin-dashboard?tab=activity',
      icon: <Shield className="mr-2 h-4 w-4" />,
      tabValue: 'activity'
    },
    {
      title: 'Settings',
      href: '/admin-dashboard?tab=settings',
      icon: <Settings className="mr-2 h-4 w-4" />,
      tabValue: 'settings'
    }
  ];
  
  return (
    <div className={cn("px-3 py-2", className)}>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="w-full"
      >
        <div className="flex items-center justify-between py-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Admin Menu
          </h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle admin menu</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.tabValue === activeTab;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "transparent"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 