"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Figma, Layout, UserPlus, Calculator, Github, Paperclip, ArrowUp, Menu, User } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ApiKeyInput } from '@/components/chat/ApiKeyInput';
import { getStoredApiKey, storeApiKey } from '@/utils/apiKey';
import { Chat } from '@/components/chat/Chat';

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  useEffect(() => {
    const apiKey = getStoredApiKey();
    setHasApiKey(!!apiKey);
  }, []);

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
    if ((!input.trim() && uploadedFiles.length === 0 && !githubUrl) || isLoading) return;
    
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }
    
    setIsLoading(true);
    try {
      localStorage.setItem('initial_prompt', input);
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        for (const file of uploadedFiles) {
          const reader = new FileReader();
          reader.onloadend = () => {
            localStorage.setItem(`file_${file.name}`, reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
      if (githubUrl) {
        localStorage.setItem('github_url', githubUrl);
      }
      router.push('/chat');
    } catch (error) {
      console.error('Error processing request:', error);
      setIsLoading(false);
    }
  };

  const handleApiKeySubmit = (apiKey: string) => {
    storeApiKey(apiKey);
    setShowApiKeyInput(false);
    handleInitialPrompt(new Event('submit') as any);
  };

  const quickActions = [
    { icon: Camera, label: 'Clone a Screenshot', action: () => {} },
    { icon: Figma, label: 'Import from Figma', action: () => {} },
    { icon: Layout, label: 'Landing Page', action: () => {} },
    { icon: UserPlus, label: 'Sign Up Form', action: () => {} },
    { icon: Calculator, label: 'Calculate Factorial', action: () => {} },
  ];

  if (showApiKeyInput) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="w-full max-w-[600px] m-4">
          <ApiKeyInput onSubmit={handleApiKeySubmit} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center flex-1">
              {/* Logo/Brand */}
              <div className="flex-shrink-0">
                <Link href="/" className="text-xl font-bold">
                  Zirak
                </Link>
              </div>

              {/* Desktop Navigation - Moved to the left */}
              <div className="hidden md:flex md:items-center md:ml-8 space-x-4">
                <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Dashboard
                </Link>
                <Link href="/features" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Features
                </Link>
                <Link href="/docs" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Documentation
                </Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Pricing
                </Link>
              </div>
            </div>

            {/* User Actions - Kept on the right */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Sign in
              </Button>
              <Button className="bg-white text-black hover:bg-gray-200">
                Get Started
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-gray-300 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation - Updated with Features */}
          {showMobileMenu && (
            <div className="md:hidden py-2 space-y-1">
              <Link href="/dashboard" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Dashboard
              </Link>
              <Link href="/features" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Features
              </Link>
              <Link href="/docs" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Documentation
              </Link>
              <Link href="/pricing" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Pricing
              </Link>
              <div className="pt-4 pb-3 border-t border-white/10">
                <Button variant="ghost" className="w-full text-left text-gray-300 hover:text-white">
                  Sign in
                </Button>
                <Button className="w-full mt-2 bg-white text-black hover:bg-gray-200">
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex items-center justify-center flex-1 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-3xl px-4">
          <h1 className="text-5xl font-bold mb-12 text-center">
            What can I help you ship?
          </h1>
          
          <div className="relative">
            <form onSubmit={handleInitialPrompt} className="relative">
              <div className="relative flex items-center">
                <Input
                  id="initial-prompt"
                  className="w-full bg-[#111111] border-none text-lg py-6 pl-4 pr-20 rounded-xl placeholder:text-gray-500 focus:ring-0 focus:border-none"
                  placeholder="Ask v0 to build..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <div className="absolute right-4 flex items-center space-x-2">
                  <button
                    type="button"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    {...getRootProps()}
                  >
                    <input {...getInputProps()} />
                    <Paperclip className="h-5 w-5 text-gray-400" />
                  </button>
                  <button
                    type="submit"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={isLoading || (!input.trim() && uploadedFiles.length === 0 && !githubUrl)}
                  >
                    <ArrowUp className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-6">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-[#111111] border-none hover:bg-white/10 text-white flex items-center space-x-2 rounded-full px-4 py-2"
                  onClick={action.action}
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[#111111] rounded-lg">
                    <span className="text-sm text-gray-400 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
