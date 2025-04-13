"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
import React from "react";

// Import Project type
interface Project {
  id: string;
  name: string;
  path: string;
  lastAccessed: string;
  config?: {
    description: string;
    type: string;
    language: string;
    framework?: string;
  };
}

// Props for NavbarWithProject
interface NavbarWithProjectProps {
  currentProject?: Project | null;
  onSelectProject: (project: Project) => Promise<void>;
  onCreateProject: (project: Project) => Promise<void>;
  onConfigureProject: () => void;
}

const links = [
  { name: "Features", href: "/#features" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/#about" },
  { name: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#2A2A2A]"
          : "bg-[#1A1A1A]"
      )}
    >
      <div className="flex h-12 items-center justify-between w-full">
        <div className="flex items-center pl-2">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-bold">My App</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center pr-4">
          <div className="flex items-center space-x-4 mr-4">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-xs font-medium transition-colors hover:text-primary",
                  isScrolled ? "text-foreground" : "text-foreground/90"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {pathname !== "/login" && (
              <Link href="/login">
                <Button variant="outline" className="text-xs h-7 px-2">
                  Sign In
                </Button>
              </Link>
            )}
            {pathname !== "/dashboard" && (
              <Link href="/dashboard">
                <Button className="text-xs h-7 px-2">Dashboard</Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile navigation toggle */}
        <div className="flex items-center md:hidden pr-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-2"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {mobileNavOpen && (
        <div className="md:hidden border-b bg-[#1A1A1A] w-full">
          <div className="py-2 px-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block py-1.5 text-foreground text-sm"
                onClick={() => setMobileNavOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col space-y-2 pt-2 border-t">
              <Link
                href="/login"
                onClick={() => setMobileNavOpen(false)}
              >
                <Button variant="outline" className="w-full h-8 text-xs">
                  Sign In
                </Button>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
              >
                <Button className="w-full h-8 text-xs">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// New NavbarWithProject component that includes project selection
export function NavbarWithProject({ 
  currentProject, 
  onSelectProject, 
  onCreateProject, 
  onConfigureProject 
}: NavbarWithProjectProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#2A2A2A]"
          : "bg-[#1A1A1A]"
      )}
    >
      <div className="flex h-12 items-center justify-between w-full">
        <div className="flex items-center pl-2">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-bold">Zirak</span>
          </Link>
          
          {/* Add ProjectSelector here */}
          {pathname?.includes('/chat') && (
            <div>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mx-0.5">&gt;</span>
                {/* Import ProjectSelector component dynamically to avoid circular dependencies */}
                <div className="inline-block">
                  {React.createElement(
                    require('@/components/chat/ProjectSelector').ProjectSelector,
                    {
                      currentProject,
                      onSelect: onSelectProject,
                      onCreateProject: onCreateProject,
                      onConfigureProject: onConfigureProject,
                      navbarMode: true
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center pr-4">
          <div className="flex items-center space-x-4 mr-4">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-xs font-medium transition-colors hover:text-primary",
                  isScrolled ? "text-foreground" : "text-foreground/90"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            {pathname !== "/login" && (
              <Link href="/login">
                <Button variant="outline" className="text-xs h-7 px-2">
                  Sign In
                </Button>
              </Link>
            )}
            {pathname !== "/dashboard" && (
              <Link href="/dashboard">
                <Button className="text-xs h-7 px-2">Dashboard</Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile navigation toggle */}
        <div className="flex items-center md:hidden pr-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-2"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {mobileNavOpen && (
        <div className="md:hidden border-b bg-[#1A1A1A] w-full">
          <div className="py-2 px-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block py-1.5 text-foreground text-sm"
                onClick={() => setMobileNavOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="flex flex-col space-y-2 pt-2 border-t">
              <Link
                href="/login"
                onClick={() => setMobileNavOpen(false)}
              >
                <Button variant="outline" className="w-full h-8 text-xs">
                  Sign In
                </Button>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
              >
                <Button className="w-full h-8 text-xs">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
