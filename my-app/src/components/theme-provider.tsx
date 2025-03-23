"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
  // Use any here to workaround type conflicts
} & Parameters<typeof NextThemesProvider>[0];

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so we can safely show the UI after mounting
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by only rendering children once mounted on client
  return (
    <NextThemesProvider {...props}>
      {mounted ? children : null}
    </NextThemesProvider>
  );
}
