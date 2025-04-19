'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface WaitlistFormProps {
  className?: string;
  variant?: 'default' | 'compact' | 'embedded';
  source?: string;
}

export function WaitlistForm({ 
  className = '', 
  variant = 'default',
  source = 'homepage' 
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          source
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }
      
      // Success
      setSubmitted(true);
      toast.success(data.message || 'You have been added to our waitlist!');
      
      // Reset form after a delay
      setTimeout(() => {
        setEmail('');
      }, 2000);
      
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast.error((error as Error).message || 'Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Different styling based on the variant
  let containerClasses = 'flex flex-col space-y-3';
  let inputContainerClasses = 'flex flex-col sm:flex-row gap-2';
  
  if (variant === 'compact') {
    containerClasses = 'flex flex-col space-y-2';
    inputContainerClasses = 'flex flex-row gap-2';
  } else if (variant === 'embedded') {
    containerClasses = 'flex flex-col space-y-2';
    inputContainerClasses = 'flex flex-col sm:flex-row gap-2';
  }
  
  return (
    <div className={`${containerClasses} ${className}`}>
      {variant !== 'compact' && (
        <div className="flex items-center mb-1">
          <Mail className="h-4 w-4 mr-2 text-blue-400" />
          <h3 className="text-base font-medium">
            Join our waitlist
          </h3>
        </div>
      )}
      
      {!submitted ? (
        <form onSubmit={handleSubmit} className={inputContainerClasses}>
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="flex-1"
            required
          />
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className={variant === 'embedded' ? 'w-full sm:w-auto' : ''}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Join Waitlist'
            )}
          </Button>
        </form>
      ) : (
        <div className="flex items-center px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <p className="text-sm text-green-600 dark:text-green-400">
            Thank you! We'll notify you when access is available.
          </p>
        </div>
      )}
      
      {variant !== 'compact' && !submitted && (
        <p className="text-xs text-muted-foreground">
          We'll notify you when early access becomes available. No spam, ever.
        </p>
      )}
    </div>
  );
} 