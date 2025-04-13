'use client';

import { forgotPasswordAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ForgotPassword() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [customSuccess, setCustomSuccess] = useState<string | null>(null);
  
  const message = error 
    ? { type: "error" as const, message: error }
    : success
    ? { type: "success" as const, message: success }
    : null;

  // Fallback method using API endpoint
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setCustomError(null);
    setCustomSuccess(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setCustomError(data.error || 'An error occurred');
        return;
      }
      
      setCustomSuccess(data.message || 'Check your email for a link to reset your password.');
    } catch (error) {
      console.error('[Manual Reset Password] Error:', error);
      setCustomError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col w-full gap-2 text-foreground [&>input]:mb-6 min-w-64 max-w-64 mx-auto">
      <div>
        <h1 className="text-2xl font-medium">Reset Password</h1>
        <p className="text-sm text-foreground mb-6">
          Already have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
      <div className="flex flex-col gap-2 [&>input]:mb-3">
        <Label htmlFor="email">Email</Label>
        <Input name="email" placeholder="you@example.com" required />
        
        {/* Display custom error/success messages */}
        {customError && (
          <div className="text-red-500 text-sm mt-2">{customError}</div>
        )}
        {customSuccess && (
          <div className="text-green-500 text-sm mt-2">{customSuccess}</div>
        )}
        
        {/* Manual submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending Reset Link...' : 'Reset Password'}
        </Button>
        
        <FormMessage message={message} />
      </div>
      
      <div className="bg-muted/50 px-5 py-3 border rounded-md flex gap-4 mt-6">
        <div className="flex flex-col gap-1">
          <small className="text-sm">
            <strong>Note:</strong> Check your email for a password reset link after submitting this form.
          </small>
        </div>
      </div>
    </form>
  );
} 