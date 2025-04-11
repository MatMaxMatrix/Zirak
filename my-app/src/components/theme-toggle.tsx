"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 w-8 px-0 ${
            theme === 'light' 
              ? 'text-amber-700 hover:text-gray-900 hover:bg-gray-200' 
              : 'text-yellow-400 hover:text-white hover:bg-black'
          }`}
        >
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-black border-gray-800'}`}
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className={`${
            theme === 'light' 
              ? 'text-amber-700 hover:text-gray-900 hover:bg-gray-100' 
              : 'text-yellow-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className={`${
            theme === 'light' 
              ? 'text-amber-700 hover:text-gray-900 hover:bg-gray-100' 
              : 'text-yellow-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")} 
          className={`${
            theme === 'light' 
              ? 'text-amber-700 hover:text-gray-900 hover:bg-gray-100' 
              : 'text-yellow-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleSimple() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleTheme} 
      className={`h-8 w-8 px-0 ${
        theme === 'light' 
          ? 'text-amber-700 hover:text-gray-900 hover:bg-gray-200' 
          : 'text-yellow-400 hover:text-white hover:bg-black'
      }`}
    >
      <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
