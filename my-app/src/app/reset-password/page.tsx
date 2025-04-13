'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [apiMode, setApiMode] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  
  // Check if user has a valid session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error.message);
          setApiMode(true); // Fall back to API mode
          setCheckingSession(false);
          return;
        }
        
        if (!session) {
          console.log('No active session found for password reset');
          setApiMode(true); // Fall back to API mode
          setCheckingSession(false);
          return;
        }
        
        // Session is valid
        setCheckingSession(false);
      } catch (error) {
        console.error('Unexpected error checking session:', error);
        setApiMode(true); // Fall back to API mode
        setCheckingSession(false);
      }
    };
    
    checkSession();
  }, [supabase.auth]);
  
  // Password validation
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    // Check for at least one uppercase, lowercase, number, and special character
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return { 
        valid: false, 
        message: 'Password must include uppercase, lowercase, number, and special character' 
      };
    }
    
    return { valid: true };
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(validation.message);
      setIsLoading(false);
      return;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      let success = false;
      
      // Try updating via the direct Supabase client first
      if (!apiMode) {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        
        if (error) {
          console.error('Password update using client error:', error.message);
          // If this fails, we'll fall back to the API below
        } else {
          success = true;
        }
      }
      
      // Fall back to the API if client method fails or we're in API mode
      if (!success) {
        console.log('Falling back to API endpoint for password update');
        
        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Password update API error:', data.error);
          
          // Check for the specific "same password" error
          if (data.error && data.error.includes('same password')) {
            toast.error('Your new password must be different from your current password');
          } else {
            toast.error(`Unable to update password: ${data.error}`);
          }
          
          setIsLoading(false);
          return;
        }
        
        success = true;
      }
      
      // Clear sensitive data
      setPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
      
      // Small delay before redirect to show success message
      setTimeout(() => {
        router.push('/sign-in');
      }, 1500);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('An unexpected error occurred. Please try again later.');
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Verifying your password reset session...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Reset Your Password</h1>
          <p className="text-muted-foreground">Create a new secure password</p>
        </div>
        
        {apiMode && (
          <Alert className="mb-4">
            <AlertDescription>
              Using alternative method to reset your password.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
} 