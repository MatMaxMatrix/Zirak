"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Figma, Layout, UserPlus, Calculator, Github, Paperclip, ArrowUp, Menu, User, Code, Terminal, GitBranch, Globe, Database, Server, CheckCircle, ExternalLink, Zap, Bot, MessageSquare, BrainCircuit, Shield, PlayCircle, Maximize2, Info, Code2, ArrowRight, ChevronRight, ChevronLeft, Play, Pause } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { hasAnyApiKey, getPreferredApiKey } from '@/utils/apiKey';
import { Chat } from '@/components/chat/Chat';
import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';

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
  const [activeDemo, setActiveDemo] = useState<number>(0);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if the user has any API key configured
    setHasApiKey(hasAnyApiKey());
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
    if ((!input.trim() && uploadedFiles.length === 0 && !githubUrl) || isSubmitting) return;
    
    // Check for preferred API key
    const { key, provider } = getPreferredApiKey();
    if (!key) {
      toast.error("No API key configured. Redirecting to settings...");
      setTimeout(() => {
        router.push("/user-dashboard/profile/api-settings");
      }, 1500);
      return;
    }
    
    setIsSubmitting(true);
    try {
      localStorage.setItem('initial_prompt', input);
      localStorage.setItem('api_provider', provider || 'openai'); // Store the preferred provider
      
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
      
      // Check if user is authenticated before redirecting
      if (user) {
        // If authenticated, redirect to waitlist
        router.push('/waitlist');
      } else {
        // If not authenticated, redirect to login page
        router.push('/api/auth/login?returnTo=/waitlist');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setIsSubmitting(false);
    }
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
      icon: MessageSquare,
      features: [
        { title: "Multi-agent collaboration", icon: UserPlus },
        { title: "Natural language interface", icon: MessageSquare },
        { title: "Problem decomposition", icon: BrainCircuit }
      ]
    },
    {
      title: "AI-Powered File Editor",
      description: "Smart code editing with real-time suggestions, error detection, and automatic optimizations.",
      videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-programming-a-robot-6463-large.mp4",
      backgroundColor: "from-emerald-500/20 to-green-500/10",
      accentColor: "emerald",
      icon: Code,
      features: [
        { title: "Real-time code suggestions", icon: Code2 },
        { title: "Error detection & fixing", icon: Shield },
        { title: "Performance optimization", icon: Zap }
      ]
    },
    {
      title: "Visual Web Browser",
      description: "AI-driven browser that can navigate, interact with, and extract data from websites autonomously.",
      videoSrc: "https://assets.mixkit.co/videos/preview/mixkit-typing-on-a-keyboard-working-at-a-computer-office-4466-large.mp4",
      backgroundColor: "from-purple-500/20 to-fuchsia-500/10",
      accentColor: "purple",
      icon: Globe,
      features: [
        { title: "Autonomous navigation", icon: GitBranch },
        { title: "Data extraction & analysis", icon: Database },
        { title: "Visual interaction", icon: Maximize2 }
      ]
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

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Enhanced Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[500px] -left-[500px] w-[1000px] h-[1000px] bg-radial-gradient from-purple-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow" />
        <div className="absolute -top-[300px] -right-[400px] w-[800px] h-[800px] bg-radial-gradient from-blue-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow delay-1000" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-radial-gradient from-indigo-500/10 to-transparent rounded-full blur-3xl opacity-20 animate-pulse-slow delay-2000" />
      </div>

      {/* Main Content */}
      <main className="w-full pt-16">
        <div className="flex flex-col items-center justify-center py-16 px-4 relative w-full">
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
            className="w-full max-w-3xl"
          >
            <div className="flex flex-col gap-4">
              {/* Enhanced Kurdish flag themed container with modern chat interface */}
              <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-green-600/30 backdrop-blur-md border border-white/30 hover:shadow-red-600/30 transition-all duration-500 kurdish-flag-container">
                {/* Kurdish flag inspired background with animated gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-600 via-white to-green-600 opacity-80 kurdish-flag-background"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/40 to-transparent opacity-30 animate-pulse-slow"></div>
                
                {/* Enhanced decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-600 via-white to-red-600"></div>
                <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-white to-green-600"></div>
                
                {/* Kurdish sun emblem with improved animation */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-yellow-500 opacity-25 animate-pulse-slow kurdish-sun-emblem"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 kurdish-sun-emblem">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {Array.from({ length: 21 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-1 h-9 bg-yellow-500 opacity-25"
                        style={{ 
                          transform: `rotate(${i * (360 / 21)}deg)`,
                          transformOrigin: 'bottom center',
                          bottom: '50%'
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Modern chat interface container */}
                <div className="relative p-8 bg-black/40 backdrop-blur-md kurdish-flag-content">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white drop-shadow-md">Tell me what you want to build</h3>
                    <div className="flex space-x-2">
                      <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="h-3 w-3 rounded-full bg-white delay-100 animate-pulse"></span>
                      <span className="h-3 w-3 rounded-full bg-green-500 delay-200 animate-pulse"></span>
                    </div>
                  </div>
                  
                  {/* Chat message bubbles */}
                  <div className="mb-4 space-y-3 max-h-[120px] overflow-y-auto custom-scrollbar p-2 -mx-2">
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shadow-md">Z</div>
                      <div className="bg-black/30 backdrop-blur-sm rounded-xl rounded-tl-none p-3 text-white text-sm max-w-[80%] shadow-md border border-white/10 kurdish-chat-bubble">
                        Hello! I'm Zirak, your AI assistant. How can I help you build something amazing today?
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 justify-end">
                      <div className="bg-green-600/80 backdrop-blur-sm rounded-xl rounded-tr-none p-3 text-white text-sm max-w-[80%] shadow-md border border-white/10 kurdish-chat-bubble kurdish-user-bubble">
                        I need a website with user authentication.
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 text-xs font-bold shadow-md">U</div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shadow-md">Z</div>
                      <div className="bg-black/30 backdrop-blur-sm rounded-xl rounded-tl-none p-3 text-white text-sm max-w-[80%] shadow-md border border-white/10 kurdish-chat-bubble">
                        Great! I can help you build a website with authentication. Let's get started.
                      </div>
                    </div>
                  </div>
                  
                  {/* Modern input area with special effects */}
                  <div className="flex gap-3 relative">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe your project or ask a question..."
                      className="flex-1 bg-black/50 border-white/30 text-white placeholder-gray-300 py-6 text-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/50 rounded-xl pr-12 kurdish-input"
                    />
                    <div className="absolute right-20 top-1/2 -translate-y-1/2 flex space-x-2">
                      <button className="text-white/70 hover:text-white transition-colors">
                        <Paperclip className="h-5 w-5" />
                      </button>
                    </div>
                    <Button 
                      onClick={handleInitialPrompt}
                      disabled={isSubmitting}
                      className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 text-white px-8 py-6 text-lg border-none shadow-md hover:shadow-lg rounded-xl group"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span>Start</span>
                          <ArrowUp className="ml-2 h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-white/90 drop-shadow-md">Build AI applications, websites, games, and more with our intelligent assistants</p>
                  
                  {/* Chat features indicator */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-black/30 text-white kurdish-feature-badge">
                        <BrainCircuit className="h-3 w-3 mr-1" />
                        AI Powered
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-black/30 text-white kurdish-feature-badge">
                        <Shield className="h-3 w-3 mr-1" />
                        Secure
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-black/30 text-white kurdish-feature-badge">
                        <Zap className="h-3 w-3 mr-1" />
                        Fast
                      </span>
                    </div>
                    <div className="text-xs text-white/60 kurdish-status-text">
                      <span className="inline-flex items-center">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse"></span>
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
                  className="bg-[#111111] border-2 border-gray-800/50 hover:border-purple-500/50 hover:bg-purple-500/10 text-white flex items-center space-x-2 rounded-full px-4 py-2 backdrop-blur-sm transition-all group"
                  onClick={action.action}
                >
                  <action.icon className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <span>{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {/* Modern Interactive Video Showcase Section */}
          <div className="mb-32 overflow-hidden w-full max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="inline-block px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4"
              >
                🎥 Live Demos
              </motion.span>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                See Zirak in Action
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Watch how our AI platform transforms the way you build software
              </p>
            </motion.div>
            
            {/* Horizontal Scrolling Carousel */}
            <div className="relative w-full max-w-[1200px] mx-auto">
              {/* Navigation Arrows */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="h-12 w-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg hover:bg-purple-500/50 transition-all"
                  onClick={() => navigateDemo('prev')}
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="h-12 w-12 rounded-full bg-black/50 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg hover:bg-purple-500/50 transition-all"
                  onClick={() => navigateDemo('next')}
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </div>
              
              {/* Full-width Carousel Container */}
              <motion.div 
                className="flex w-full overflow-hidden"
                animate={{ 
                  x: `-${activeDemo * 100}%`,
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
              >
                {demoItems.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="w-full flex-shrink-0"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border-2 border-gray-800/50 hover:shadow-purple-500/30 transition-all duration-300 h-[500px] w-full">
                      <div className={`bg-gradient-to-br ${item.backgroundColor} h-full w-full relative overflow-hidden`}>
                        <video 
                          key={item.videoSrc}
                          className="w-full h-full object-cover"
                          src={item.videoSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                        
                        {/* Enhanced Video Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-between p-8 bg-gradient-to-b from-black/70 via-transparent to-black/90">
                          {/* Top Section */}
                          <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center space-x-4"
                          >
                            <div className={`h-16 w-16 rounded-2xl bg-${item.accentColor}-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg animate-pulse-slow`}>
                              {React.createElement(item.icon, { className: "h-8 w-8 text-white" })}
                            </div>
                            <div>
                              <h3 className="text-3xl font-bold text-white">{item.title}</h3>
                              <div className="flex items-center mt-2 space-x-2">
                                <span className={`inline-block h-2 w-2 rounded-full bg-${item.accentColor}-400 animate-pulse`}></span>
                                <span className="text-sm text-gray-200 font-mono">Live Demo</span>
                              </div>
                            </div>
                          </motion.div>

                          {/* Bottom Section */}
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-between"
                          >
                            <div className="max-w-2xl">
                              <p className="text-base text-gray-300 mb-4">{item.description}</p>
                              <div className="flex flex-wrap gap-2">
                                {item.features.map((feature, featureIndex) => (
                                  <span
                                    key={featureIndex}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/5 text-gray-300"
                                  >
                                    <feature.icon className="h-4 w-4 mr-2 text-purple-400" />
                                    {feature.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button 
                                variant="outline"
                                className="border-2 border-white/20 hover:border-white/40 text-white text-base px-6 py-4 rounded-xl backdrop-blur-sm"
                                onClick={togglePlayPause}
                              >
                                {isVideoPaused ? 
                                  <Play className="mr-2 h-4 w-4" /> : 
                                  <Pause className="mr-2 h-4 w-4" />
                                }
                                {isVideoPaused ? "Play" : "Pause"}
                              </Button>
                            </motion.div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            
            {/* Navigation Dots */}
            <div className="flex justify-center mt-8 space-x-4">
              {demoItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setActiveDemo(index)}
                  className={`h-4 transition-all duration-500 ${
                    activeDemo === index 
                      ? `w-12 bg-gradient-to-r from-${item.accentColor}-400 to-${item.accentColor}-600 rounded-full`
                      : 'w-4 bg-gray-700 hover:bg-gray-500 rounded-full'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Features Illustration Section */}
          <div className="mb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-4"
              >
                ✨ Features
              </motion.span>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent feature-text">
                Everything You Need to Build Better Software
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto feature-text">
                Our AI-powered platform combines multiple specialized agents to help you develop faster and smarter
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: Chat Interface */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-6">
                    <MessageSquare className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 feature-text">Intelligent Chat Interface</h3>
                  <p className="text-gray-400 mb-4 feature-text">
                    Communicate with multiple AI agents through a streamlined chat interface. Ask questions, request features, and get real-time responses.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">Natural Language</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">Real-time Responses</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400">Multi-agent Support</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature 2: Code Generation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-6">
                    <Code className="h-6 w-6 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 feature-text">Smart Code Generation</h3>
                  <p className="text-gray-400 mb-4 feature-text">
                    Generate production-ready code based on your requirements. Our AI understands context and produces optimized, secure implementations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400">Context-aware</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400">Optimized Code</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400">Security Focused</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature 3: Terminal Integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-6">
                    <Terminal className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Integrated Terminal</h3>
                  <p className="text-gray-400 mb-4">
                    Execute commands directly within the application. Run, test, and debug your code without switching between different tools.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">Command Execution</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">Real-time Output</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400">Debug Support</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature 4: GitHub Integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center mb-6">
                    <GitBranch className="h-6 w-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">GitHub Integration</h3>
                  <p className="text-gray-400 mb-4">
                    Connect directly to GitHub repositories. Import, modify, and contribute to your projects with intelligent assistance.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-red-500/10 text-red-400">Repository Access</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-red-500/10 text-red-400">Version Control</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-red-500/10 text-red-400">Collaboration</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature 5: Web Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-6">
                    <Globe className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Web Preview</h3>
                  <p className="text-gray-400 mb-4">
                    Instantly preview your web applications within the platform. See changes in real-time as you develop.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-400">Live Preview</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-400">Real-time Updates</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-cyan-500/10 text-cyan-400">Responsive Design</span>
                  </div>
                </div>
              </motion.div>

              {/* Feature 6: Security */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -5 }}
                className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-8 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-6">
                    <Shield className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Security-First Development</h3>
                  <p className="text-gray-400 mb-4">
                    Our AI constantly monitors for security vulnerabilities and suggests secure coding practices to protect your applications.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">Vulnerability Detection</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">Secure Coding</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">Compliance</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Call to Action Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mb-16 text-center relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/20 border border-purple-500/30 p-12 backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-noise opacity-10" />
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-block px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium mb-4"
            >
              🚀 Get Started Today
            </motion.span>
            <h2 className="text-3xl font-bold mb-4 text-white">Ready to transform your development workflow?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the early access program and experience the future of software development.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-6 text-lg rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg shadow-purple-500/20"
                onClick={() => user ? router.push('/waitlist') : router.push('/api/auth/login?returnTo=/waitlist')}
              >
                <span className="relative z-10">Join Early Access</span>
                <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/10 to-transparent" />
              </Button>
              
              <Button 
                className="relative overflow-hidden bg-transparent border-2 border-white/20 text-white px-8 py-6 text-lg rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg group"
                onClick={() => router.push('/api/auth/login?prompt=signup')}
              >
                <span className="relative z-10">Sign Up</span>
                <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/10 to-transparent" />
                <div className="opacity-0 group-hover:opacity-100 absolute -top-14 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm p-2 rounded-md text-sm text-white min-w-[200px] transition-all duration-200 border border-gray-700">
                  Email verification required after signup
                </div>
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Limited spots available • Free during beta • Help shape the future
            </p>
          </motion.div>

          {/* Footer */}
          <footer className="w-screen border-t border-white/20 py-12 bg-black/50 backdrop-blur-sm">
            <div className="w-full px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                <div>
                  <div className="text-2xl font-bold text-white mb-4">Zirak</div>
                  <p className="text-sm text-yellow-400">Building the future of AI-powered development</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
                  <ul className="space-y-2">
                    <li><Link href="/features" className="text-sm text-gray-300 hover:text-red-500 transition-colors">Features</Link></li>
                    <li><Link href="/pricing" className="text-sm text-gray-300 hover:text-red-500 transition-colors">Pricing</Link></li>
                    <li><Link href="/waitlist" className="text-sm text-gray-300 hover:text-red-500 transition-colors">Chat Interface</Link></li>
                    <li><Link href="/user-dashboard" className="text-sm text-gray-300 hover:text-red-500 transition-colors">Dashboard</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
                  <ul className="space-y-2">
                    <li><Link href="/profile" className="text-sm text-gray-300 hover:text-red-500 transition-colors">Profile</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4">Contact Us</h3>
                  <ul className="space-y-2">
                    <li>
                      <button 
                        onClick={() => {
                          const subject = "Inquiry about Zirak";
                          const body = "Hello,\n\nI am interested in learning more about Zirak. Please provide more information about:\n\n";
                          const mailtoLink = `mailto:azimipanah.mobin@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          window.location.href = mailtoLink;
                        }}
                        className="text-sm text-gray-300 hover:text-red-500 transition-colors"
                      >
                        Email Support
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-white/20 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-white">
                    © 2025 Zirak. All rights reserved.
                  </div>
                  <div className="flex items-center space-x-6">
                    <Link href="https://github.com" className="text-gray-300 hover:text-red-500 transition-colors">
                      <Github className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>

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

