"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { notification } from "@/lib/notification";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Mail, Key, ArrowRight, Home, LogIn, Info, User, Menu, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" }),
});

// Navigation component
function Navigation() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };
  
  const NavLink = ({ href, icon, label, isActive = false }: { href: string, icon: React.ReactNode, label: string, isActive?: boolean }) => (
    <button
      onClick={() => navigateTo(href)} 
      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-primary/10 text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  
  // Wait until client-side rendering to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95">
        <div className="container flex h-14 items-center"></div>
      </header>
    );
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-lg">Dashboard</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-6">
          <NavLink href="/" icon={<Home className="h-4 w-4" />} label="Home" />
          <NavLink href="/login" icon={<LogIn className="h-4 w-4" />} label="Login" isActive={true} />
          <NavLink href="/about" icon={<Info className="h-4 w-4" />} label="About" />
          <NavLink href="/dashboard" icon={<User className="h-4 w-4" />} label="Dashboard" />
        </nav>
        
        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <div className="flex flex-col space-y-3 mt-8">
              <NavLink href="/" icon={<Home className="h-4 w-4 mr-2" />} label="Home" />
              <NavLink href="/login" icon={<LogIn className="h-4 w-4 mr-2" />} label="Login" isActive={true} />
              <NavLink href="/about" icon={<Info className="h-4 w-4 mr-2" />} label="About" />
              <NavLink href="/dashboard" icon={<User className="h-4 w-4 mr-2" />} label="Dashboard" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// The login form component that uses the searchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error or success in query parameters
  useEffect(() => {
    // Check for error message
    const errorParam = searchParams?.get("error");
    if (errorParam === "CredentialsSignin") {
      setError("Invalid email or password. Please try again.");
    } else if (errorParam) {
      setError("An error occurred during sign in. Please try again.");
    }

    // Check for success message
    const successParam = searchParams?.get("success");
    if (successParam) {
      notification.success("You have been successfully logged out.");
    }
  }, [searchParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting to sign in with:", values.email);

      // For demo purposes, we'll manually check the credentials against our known users
      // In a real app, you would use a proper authentication system
      if (
        (values.email === "admin@example.com" && values.password === "password123") ||
        (values.email === "user@example.com" && values.password === "password123")
      ) {
        // Simulate loading for demo purposes
        await new Promise(resolve => setTimeout(resolve, 800));

        // Set a simple cookie to simulate authentication
        document.cookie = `auth_user=${values.email}; path=/; max-age=86400`;

        notification.success("Logged in successfully!");

        // Navigate to dashboard
        router.push("/dashboard");
      } else {
        console.error("Login error: Invalid credentials");
        setError("Invalid email or password. Please try again.");
        notification.error("Login failed. Please check your email and password.");
      }
    } catch (error) {
      console.error("Unexpected login error:", error);
      setError(`Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}`);
      notification.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  // Reset error when form values change
  useEffect(() => {
    const subscription = form.watch(() => setError(null));
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 pt-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Enter your credentials to access your account</p>
        </div>
        
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full">
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </Button>
            <Button variant="outline" className="w-full">
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
              </svg>
              Google
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="you@example.com"
                              className="pl-10"
                              {...field}
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link
                            href="#"
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              {...field}
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" id="remember" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Remember me
                    </label>
                  </div>
                
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 border-t p-4">
              <div className="text-sm text-center text-muted-foreground">
                Demo credentials
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" size="sm" onClick={() => {
                  form.setValue("email", "admin@example.com");
                  form.setValue("password", "password123");
                }}>
                  Admin User
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  form.setValue("email", "user@example.com");
                  form.setValue("password", "password123");
                }}>
                  Regular User
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="#" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

// Fallback component while the login form is loading
function LoginFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 pt-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-8 w-48 bg-muted/30 animate-pulse rounded-md mx-auto" />
          <div className="h-4 w-64 bg-muted/30 animate-pulse rounded-md mx-auto" />
        </div>
        
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 w-full bg-muted/30 animate-pulse rounded-md" />
            <div className="h-10 w-full bg-muted/30 animate-pulse rounded-md" />
          </div>
          
          <div className="h-6 w-full bg-muted/10 animate-pulse rounded-md" />
          
          <div className="h-64 w-full bg-muted/30 animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <>
      <Navigation />
      <Suspense fallback={<LoginFormFallback />}>
        <div suppressHydrationWarning>
          <LoginForm />
        </div>
      </Suspense>
    </>
  );
}
