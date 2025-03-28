"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Figma, Layout, UserPlus, Calculator, Github, Paperclip, ArrowUp, Menu, User, Code, Terminal, GitBranch, Globe, Database, Server, CheckCircle, ExternalLink, Zap, Bot, MessageSquare, BrainCircuit, Shield, PlayCircle, Maximize2, Info, Code2, ArrowRight, ChevronRight, ChevronLeft, Play, Pause } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { ApiKeyInput } from '@/components/chat/ApiKeyInput';
import { getStoredApiKey, storeApiKey } from '@/utils/apiKey';
import { Chat } from '@/components/chat/Chat';
import React from 'react';

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [activeDemo, setActiveDemo] = useState<number>(0);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const apiKey = getStoredApiKey();
    setHasApiKey(!!apiKey);
  }, []);

  useEffect(() => {
    // Auto-rotate demos every 5 seconds
    const interval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
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

  const demoItems = [
    {
      title: "Agentic Workflow",
      description: "Watch multiple AI agents collaborate to solve complex problems through natural language conversation.",
      videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-1733-large.mp4",
      backgroundColor: "from-blue-500/20 to-indigo-500/10",
      accentColor: "blue",
      icon: MessageSquare
    },
    {
      title: "AI-Powered File Editor",
      description: "Smart code editing with real-time suggestions, error detection, and automatic optimizations.",
      videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-programming-a-robot-6463-large.mp4",
      backgroundColor: "from-emerald-500/20 to-green-500/10",
      accentColor: "emerald",
      icon: Code
    },
    {
      title: "Visual Web Browser",
      description: "AI-driven browser that can navigate, interact with, and extract data from websites autonomously.",
      videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-typing-on-a-keyboard-working-at-a-computer-office-4466-large.mp4",
      backgroundColor: "from-purple-500/20 to-fuchsia-500/10",
      accentColor: "purple",
      icon: Globe
    }
  ];

  const successStories = [
    {
      company: "TechFlow",
      quote: "We reduced our development time by 70% and improved code quality significantly.",
      industry: "Fintech",
      result: "Launched 5 new features in one week"
    },
    {
      company: "HealthConnect",
      quote: "Our team was able to build a patient portal in days instead of months.",
      industry: "Healthcare",
      result: "Improved developer productivity by 85%"
    },
    {
      company: "EcoSmart",
      quote: "We completely revamped our legacy system with minimal effort.",
      industry: "Energy",
      result: "Cut technical debt by 60%"
    }
  ];

  const featureHighlights = [
    {
      icon: Bot,
      title: "Multi-Agent Collaboration",
      description: "Our platform utilizes multiple specialized AI agents that work together to solve complex problems."
    },
    {
      icon: Code,
      title: "Contextual Code Generation",
      description: "Generate production-ready code that follows your project's patterns and best practices."
    },
    {
      icon: Terminal,
      title: "Integrated Development Environment",
      description: "Execute commands, manage files, and preview applications all from one interface."
    },
    {
      icon: Shield,
      title: "Security-First Development",
      description: "Automatically detect and fix security vulnerabilities in your code before they become problems."
    },
    {
      icon: BrainCircuit,
      title: "Continuous Learning",
      description: "Our AI gets better with each interaction, learning your preferences and coding style."
    },
    {
      icon: Zap,
      title: "Performance Optimization",
      description: "Identify and resolve performance bottlenecks with intelligent suggestions."
    }
  ];

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPaused(false);
      } else {
        videoRef.current.pause();
        setIsVideoPaused(true);
      }
    }
  };

  const navigateDemo = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setActiveDemo((prev) => (prev + 1) % demoItems.length);
    } else {
      setActiveDemo((prev) => (prev - 1 + demoItems.length) % demoItems.length);
    }
  };

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
                <Link href="/" className="text-white font-medium px-3 py-2 rounded-md text-sm">
                  Home
                </Link>
                <Link href="/features" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Features
                </Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                  Pricing
                </Link>
                <Button 
                  className="bg-white text-black hover:bg-gray-200"
                  onClick={() => router.push('/chat')}
                >
                  Get Started
                </Button>
              </div>
            </div>

            {/* User Actions - Kept on the right */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Sign in
              </Button>
              <Link href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm">
                Dashboard
              </Link>
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
              <Link href="/" className="block text-white font-medium px-3 py-2 rounded-md text-base">
                Home
              </Link>
              <Link href="/features" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Features
              </Link>
              <Link href="/pricing" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Pricing
              </Link>
              <Link href="/dashboard" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base">
                Dashboard
              </Link>
              <div className="pt-4 pb-3 border-t border-white/10">
                <Button variant="ghost" className="w-full text-left text-gray-300 hover:text-white">
                  Sign in
                </Button>
                <Button 
                  className="w-full mt-2 bg-white text-black hover:bg-gray-200"
                  onClick={() => router.push('/chat')}
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-full max-w-3xl">
            <h1 className="text-5xl font-bold mb-8 text-center">
              What can I help you ship?
            </h1>
            
            <div className="relative mb-16">
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

            {/* Modern Interactive Video Showcase Section */}
            <div className="mb-32">
              <h2 className="text-4xl font-bold mb-12 text-center animate-fadeIn">
                See What You Can Build
              </h2>
              
              <div className="relative">
                {/* Large Video Navigation Controls */}
                <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10">
                  <button 
                    onClick={() => navigateDemo('prev')}
                    className="rounded-full p-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all duration-200"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="absolute top-1/2 right-4 -translate-y-1/2 z-10">
                  <button 
                    onClick={() => navigateDemo('next')}
                    className="rounded-full p-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all duration-200"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Main Video Container */}
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-gray-800/30 transition-all duration-300">
                  <div className={`bg-gradient-to-br ${demoItems[activeDemo].backgroundColor} aspect-[16/9] relative overflow-hidden`}>
                    <div className="absolute inset-0 transition-opacity duration-500">
                      <video 
                        ref={videoRef}
                        key={demoItems[activeDemo].videoSrc}
                        className="w-full h-full object-cover"
                        src={demoItems[activeDemo].videoSrc}
                        autoPlay={!isVideoPaused}
                        loop
                        muted
                        playsInline
                      />
                    </div>
                    
                    {/* Video Controls Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-8 bg-gradient-to-b from-black/40 via-transparent to-black/80">
                      {/* Top Controls */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center animate-slideInFromLeft delay-200">
                          <div className={`h-12 w-12 rounded-2xl bg-${demoItems[activeDemo].accentColor}-500/80 backdrop-blur-sm flex items-center justify-center mr-4 shadow-lg`}>
                            {React.createElement(demoItems[activeDemo].icon, { className: "h-6 w-6 text-white" })}
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold text-white drop-shadow-md">{demoItems[activeDemo].title}</h3>
                            <div className="flex items-center mt-1">
                              <span className={`inline-block h-2 w-2 rounded-full bg-${demoItems[activeDemo].accentColor}-400 mr-2`}></span>
                              <span className="text-sm text-gray-200">Live Demo</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="backdrop-blur-sm bg-black/30 rounded-xl p-2 animate-popIn delay-300">
                          <button onClick={togglePlayPause} className="h-8 w-8 flex items-center justify-center text-white">
                            {isVideoPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Bottom Description */}
                      <div className="animate-slideInFromBottom delay-400">
                        <p className="text-xl text-white mb-6 max-w-2xl drop-shadow-md">
                          {demoItems[activeDemo].description}
                        </p>
                        
                        <div className="flex items-center space-x-4">
                          <Button 
                            onClick={() => router.push('/chat')}
                            className={`bg-${demoItems[activeDemo].accentColor}-500 hover:bg-${demoItems[activeDemo].accentColor}-600 text-white px-6 py-2 rounded-xl`}
                          >
                            Try this feature
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                          
                          <div className="flex items-center space-x-2">
                            {demoItems.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveDemo(index)}
                                className={`transition-all duration-300 ${
                                  activeDemo === index
                                    ? `w-10 h-2 bg-${demoItems[activeDemo].accentColor}-500`
                                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                                } rounded-full`}
                                aria-label={`Go to demo ${index + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Demo Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {demoItems.map((demo, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveDemo(index)}
                    className={`cursor-pointer rounded-xl overflow-hidden border transform transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] ${
                      activeDemo === index 
                        ? `border-${demo.accentColor}-500/50 bg-${demo.accentColor}-500/10` 
                        : 'border-gray-800/30 bg-gray-900/40 hover:bg-gray-800/40'
                    } shadow-md`}
                  >
                    <div className="p-5 flex items-start space-x-4">
                      <div className={`h-10 w-10 rounded-lg bg-${demo.accentColor}-500/20 flex items-center justify-center flex-shrink-0`}>
                        {React.createElement(demo.icon, { className: `h-5 w-5 text-${demo.accentColor}-400` })}
                      </div>
                      <div>
                        <h4 className={`font-medium ${activeDemo === index ? `text-${demo.accentColor}-400` : 'text-white'}`}>
                          {demo.title}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {demo.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Success Stories Section */}
            <div className="mb-24">
              <h2 className="text-3xl font-bold mb-12 text-center">Success Stories</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {successStories.map((story, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/30 p-6 hover:border-gray-600/50 transition-all">
                    <div className="flex flex-col h-full">
                      <div className="mb-4">
                        <div className="text-lg font-semibold mb-1">{story.company}</div>
                        <div className="text-xs text-gray-400">{story.industry}</div>
                      </div>
                      
                      <blockquote className="text-gray-300 italic mb-4 flex-grow">"{story.quote}"</blockquote>
                      
                      <div className="flex items-center text-sm mt-auto">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        <span className="text-green-300">{story.result}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                <Button variant="outline" className="border-white/20 hover:bg-white/10">
                  Read More Success Stories
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="mb-24">
              <h2 className="text-3xl font-bold mb-12 text-center">Why Developers Love Zirak</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featureHighlights.map((feature, index) => (
                  <div key={index} className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/50 transition-all">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="mb-16 text-center">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 p-8">
                <h2 className="text-2xl font-bold mb-4">Ready to transform your development workflow?</h2>
                <p className="text-gray-300 mb-6">Join thousands of developers building with Zirak today.</p>
                <Button 
                  className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg"
                  onClick={() => router.push('/chat')}
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold">Zirak</div>
              <div className="text-sm text-gray-400 mt-1">Accelerating software development with AI</div>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-sm text-gray-400 hover:text-white">About</Link>
              <Link href="/features" className="text-sm text-gray-400 hover:text-white">Features</Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white">Pricing</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
            © 2023 Zirak. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
