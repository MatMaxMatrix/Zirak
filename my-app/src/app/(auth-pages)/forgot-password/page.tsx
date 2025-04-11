'use client';

import { forgotPasswordAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ForgotPassword() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  
  const message = error 
    ? { type: "error" as const, message: error }
    : success
    ? { type: "success" as const, message: success }
    : null;

  return (
    <form className="flex-1 flex flex-col w-full gap-2 text-foreground [&>input]:mb-6 min-w-64 max-w-64 mx-auto">
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
        <SubmitButton formAction={forgotPasswordAction} pendingText="Sending Reset Link...">
          Reset Password
        </SubmitButton>
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