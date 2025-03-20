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
          ? "bg-background/80 backdrop-blur-md border-b"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">My App</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <div className="flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
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
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
            {pathname !== "/dashboard" && (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
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
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {mobileNavOpen && (
        <div className="md:hidden border-b bg-background">
          <div className="container mx-auto py-4 px-4 space-y-3">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block py-2 text-foreground"
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
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
              >
                <Button className="w-full">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
