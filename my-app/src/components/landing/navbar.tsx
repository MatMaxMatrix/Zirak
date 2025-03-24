"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/auth";
import { usePathname } from "next/navigation";

const links = [
  { name: "Features", href: "/#features" },
  { name: "Pricing", href: "/#pricing" },
  { name: "About", href: "/#about" },
  { name: "Contact", href: "/#contact" },
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
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-lg font-bold">My App</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-4">
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
        <div className="flex items-center md:hidden space-x-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
        <div className="md:hidden border-b bg-[#1A1A1A]">
          <div className="container mx-auto py-2 px-4 space-y-2">
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
