import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/components/AuthProvider";
import { ProfileSync } from "@/components/auth/ProfileSync";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { CSRFProvider } from "@/components/CSRFProvider";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zirak AI Assistant",
  description: "Agentic AI Assistant for Software Development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        {/* Head content managed by Next.js */}
      </head>
      <body className={`${inter.className} bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange
        >
          <CSRFProvider>
            <AuthProvider>
              <WebSocketProvider>
                <div className="flex flex-col min-h-screen bg-grid-pattern">
                  <NavBar />
                  <main className="flex-grow">
                    {children}
                  </main>
                </div>
                <ProfileSync />
              </WebSocketProvider>
              <Toaster />
            </AuthProvider>
          </CSRFProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
