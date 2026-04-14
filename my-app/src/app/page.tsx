"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Figma, Layout, UserPlus, Calculator, Github, Paperclip, ArrowUp, Menu, User, Code, Terminal, GitBranch, Globe, Database, Server, CheckCircle, ExternalLink, Zap, Bot, MessageSquare, BrainCircuit, Shield, PlayCircle, Maximize2, Info, Code2, ArrowRight, ChevronRight, ChevronLeft, Play, Pause } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { getPreferredApiKey } from '@/utils/apiKey';
import { Chat } from '@/components/chat/Chat';
import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import { ThemeToggleSimple } from "@/components/theme-toggle";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

// Add these new animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function Home() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    // Check if the user has any API key configured
    const checkApiKey = async () => {
      if (user && user.id) { // Only check if user is loaded
        const preferredKey = await getPreferredApiKey(user.id);
        setHasApiKey(preferredKey.provider !== null);
      }
    };
    if (!isAuthLoading) { // Ensure auth state is resolved
      checkApiKey();
    }
  }, [user, isAuthLoading]); // Add dependencies

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
  });

  const handleInitialPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (input.trim()) {
      localStorage.setItem('initial_prompt', input);
    }

    try {
      if (user) {
        router.push('/chat');
      } else {
        router.push('/sign-in?returnTo=/chat');
      }
    } catch (error) {
      console.error('Error redirecting to chat:', error);
      setIsSubmitting(false);
    }
  };

  // Handle Enter key press in the input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleInitialPrompt(e);
    }
  };

  const quickActions = [
    { icon: Camera, label: 'Clone a Screenshot', action: () => {} },
    { icon: Figma, label: 'Import from Figma', action: () => {} },
    { icon: Layout, label: 'Landing Page', action: () => {} },
    { icon: UserPlus, label: 'Sign Up Form', action: () => {} },
    { icon: Calculator, label: 'Calculate Factorial', action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden bg-grid-pattern flex flex-col">
      {/* Remove Enhanced Animated background elements AGAIN for pure black */}
      {/* 
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[500px] -left-[500px] w-[1000px] h-[1000px] bg-radial-gradient from-purple-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow" />
        <div className="absolute -top-[300px] -right-[400px] w-[800px] h-[800px] bg-radial-gradient from-blue-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow delay-1000" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-radial-gradient from-indigo-500/10 to-transparent rounded-full blur-3xl opacity-20 animate-pulse-slow delay-2000" />
      </div>
      */}

      {/* Main Content */}
      <main className="w-full pt-16 flex-grow">
        <div className="flex flex-col items-center justify-center py-16 px-4 relative w-full h-full">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold text-center mb-6 text-white"
          >
             <span className="text-red-500">Zirak</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-center mb-8 text-yellow-400 max-w-3xl"
          >
            Your AI-powered development platform
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full max-w-4xl"
          >
            <div className="flex flex-col gap-4">
              {/* Container: Removed background/blur, kept structure */}
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-700/50 transition-all duration-500">
                {/* Content: Padding remains */}
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">Tell me what you want to build</h3>
                    <div className="flex space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-600"></span>
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-500"></span>
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-400"></span>
                    </div>
                  </div>

                  {/* Modern input area - Use accent border for high visibility */}
                  <div className="flex gap-2 relative bg-gray-100 dark:bg-gray-800/95 rounded-lg p-3 border border-blue-500 dark:border-blue-600 shadow-inner">
                    {/* Input field styles adjusted for light/dark */}
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your project or ask a question..."
                      className="flex-1 bg-white dark:bg-gray-900/70 border border-gray-300 dark:border-gray-600/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 py-3 px-4 text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 dark:focus:border-blue-500 dark:focus:ring-blue-500/50 rounded-lg pr-10"
                    />
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 flex space-x-1">
                      {/* Paperclip button adjusted for light/dark */}
                      <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors p-1">
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                    <Button 
                      onClick={handleInitialPrompt}
                      disabled={isSubmitting}
                      variant="outline"
                      className="relative text-white border-white/50 hover:bg-white/10 hover:text-white px-5 py-3 text-base rounded-lg group"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Start
                          <ArrowUp className="ml-1.5 h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Build AI applications, websites, games, and more with our intelligent assistants</p>
                  
                  {/* Chat features indicator */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-300">
                        <BrainCircuit className="h-3 w-3 mr-1 text-blue-400" />
                        AI Powered
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-300">
                        <Shield className="h-3 w-3 mr-1 text-green-400" />
                        Secure
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-300">
                        <Zap className="h-3 w-3 mr-1 text-yellow-400" />
                        Fast
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="inline-flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-2 mt-6 justify-center"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  className="border-white/30 hover:border-white/70 hover:bg-white/10 text-gray-300 hover:text-white flex items-center space-x-2 rounded-full px-4 py-2 backdrop-blur-sm transition-all group"
                  onClick={action.action}
                >
                  <action.icon className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                  <span>{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {/* Waitlist Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16 mb-8 w-full max-w-md mx-auto"
          >
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 backdrop-blur-sm">
              <WaitlistForm variant="embedded" source="home_featured" />
            </div>
          </motion.div>

          {/* Call to Action Buttons */}
          <div className="mt-8 mb-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="relative overflow-hidden bg-transparent border-2 border-white/20 text-white px-8 py-6 text-lg rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg group"
                onClick={() => router.push('/sign-up')}
              >
                <span className="relative z-10">Sign Up</span>
                <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/10 to-transparent" />
              </Button>
            </div>
        </div>
      </main>

      {/* Footer Links Area - Now positioned at the bottom */}
      <div className="w-full px-4 pb-8 pt-4 bg-background">
        {/* Quick links instead of footer */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="ghost" 
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={() => router.push('/features')}
          >
            Features
          </Button>
          <Button 
            variant="ghost" 
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={() => router.push(user ? '/chat' : '/sign-in?returnTo=/chat')}
          >
            Chat Interface
          </Button>
          <Button 
            variant="ghost" 
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={() => router.push('/user-dashboard')}
          >
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={() => router.push('/profile')}
          >
            Profile
          </Button>
          <Button 
            variant="ghost" 
            className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <div className="flex items-center ml-1">
            <span className="text-gray-400 text-sm mr-2">Theme:</span>
            <ThemeToggleSimple />
          </div>
        </div>
        
        {/* Copyright */}
        <div className="text-sm text-gray-500 text-center mt-6">
          © 2025 Zirak. All rights reserved.
        </div>
      </div>

      {/* Add custom scrollbar styles at the bottom of the component */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
}

