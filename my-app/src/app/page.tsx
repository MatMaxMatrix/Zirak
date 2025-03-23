"use client";

import { Navbar } from "@/components/landing/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SendIcon, Circle } from "lucide-react";
import { useState } from "react";
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle the initial prompt submission
  const handleInitialPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Store the initial message to be used in chat page
      localStorage.setItem('initial_prompt', input);
      
      // Navigate to chat page
      router.push('/chat');
    } catch (error) {
      console.error('Error sending initial message:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mt-10 mb-6 dark:text-white">Zirak AI Assistant</h1>
          <p className="text-xl mb-10 text-gray-600 dark:text-gray-300">
            Your intelligent agent for software development and problem-solving
          </p>
          
          <Card className="bg-white dark:bg-gray-800 shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">What can I help you with today?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInitialPrompt} className="flex flex-col space-y-4">
                <Input 
                  id="initial-prompt"
                  className="flex-1 p-4 h-24 text-lg" 
                  placeholder="E.g., Create a React component for a task list..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <span className="animate-spin mr-2">
                        <Circle size={16} />
                      </span>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <SendIcon className="mr-2" size={16} />
                      Send
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-gray-500 dark:text-gray-400">
              Your data is processed securely and never shared with third parties.
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
