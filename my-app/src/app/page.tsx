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
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if ((!input.trim() && uploadedFiles.length === 0 && !githubUrl) || isLoading) return;
    
    // Check for preferred API key
    const { key, provider } = getPreferredApiKey();
    if (!key) {
      toast.error("No API key configured. Redirecting to settings...");
      setTimeout(() => {
        router.push("/user-dashboard/profile/api-settings");
      }, 1500);
      return;
    }
    
    setIsLoading(true);
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
      router.push('/chat');
    } catch (error) {
      console.error('Error processing request:', error);
      setIsLoading(false);
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
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[500px] -left-[500px] w-[1000px] h-[1000px] bg-radial-gradient from-purple-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow" />
        <div className="absolute -top-[300px] -right-[400px] w-[800px] h-[800px] bg-radial-gradient from-blue-500/20 to-transparent rounded-full blur-3xl opacity-30 animate-pulse-slow delay-1000" />
      </div>

      {/* Hero Section */}
      <main>
        <div className="flex flex-col items-center justify-center py-16 px-4 relative">
          <div className="w-full max-w-3xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              What can I help you ship?
            </motion.h1>
            
            <div className="relative mb-16">
              <form onSubmit={handleInitialPrompt} className="relative">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative flex items-center"
                >
                  <Input
                    id="initial-prompt"
                    className="w-full bg-[#111111] border-2 border-gray-800/50 text-lg py-6 pl-4 pr-20 rounded-2xl placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all"
                    placeholder="Ask v0 to build..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="absolute right-4 flex items-center space-x-2">
                    <button
                      type="button"
                      className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                      {...getRootProps()}
                    >
                      <input {...getInputProps()} />
                      <Paperclip className="h-5 w-5 text-purple-400" />
                    </button>
                    <button
                      type="submit"
                      className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                      disabled={isLoading || (!input.trim() && uploadedFiles.length === 0 && !githubUrl)}
                    >
                      <ArrowUp className={`h-5 w-5 ${isLoading ? 'text-gray-500' : 'text-purple-400'}`} />
                    </button>
                  </div>
                </motion.div>
              </form>

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

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-2"
                >
                  {uploadedFiles.map((file, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between p-2 bg-[#111111] border border-gray-800/50 rounded-lg"
                    >
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
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Modern Interactive Video Showcase Section - ENHANCED with Horizontal Scrolling */}
            <div className="mb-32 overflow-hidden">
              <motion.h2 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-5xl font-bold mb-12 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                See What You Can Build
              </motion.h2>
              
              {/* Horizontal Scrolling Carousel */}
              <div className="relative">
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
                <div className="w-full">
                  <motion.div
                    animate={{ x: `-${activeDemo * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 30 }}
                    className="flex"
                  >
                    {demoItems.map((item, index) => (
                      <motion.div 
                        key={index}
                        className="min-w-full p-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 border-2 border-gray-800/50 transition-all duration-300 hover:shadow-purple-500/30 h-[600px]">
                          <div className={`bg-gradient-to-br ${item.backgroundColor} h-full relative overflow-hidden`}>
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
                            <div className="absolute inset-0 flex flex-col justify-between p-12 bg-gradient-to-b from-black/70 via-transparent to-black/90">
                              {/* Top Section */}
                              <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center space-x-6"
                              >
                                <div className={`h-20 w-20 rounded-2xl bg-${item.accentColor}-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg animate-pulse-slow`}>
                                  {React.createElement(item.icon, { className: "h-10 w-10 text-white" })}
                                </div>
                                <div>
                                  <h3 className="text-4xl font-bold text-white">{item.title}</h3>
                                  <div className="flex items-center mt-3 space-x-2">
                                    <span className={`inline-block h-3 w-3 rounded-full bg-${item.accentColor}-400 animate-pulse`}></span>
                                    <span className="text-base text-gray-200 font-mono">Live Demo</span>
                                  </div>
                                </div>
                              </motion.div>

                              {/* Bottom Section */}
                              <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-8"
                              >
                                <p className="text-2xl text-white/90 max-w-3xl leading-relaxed">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center space-x-4">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button 
                                      className={`relative overflow-hidden bg-${item.accentColor}-600 hover:bg-${item.accentColor}-700 text-white text-lg px-10 py-6 rounded-xl shadow-lg transition-all duration-300 group`}
                                      onClick={() => router.push('/chat')}
                                    >
                                      <span className="relative z-10 flex items-center">
                                        Try this feature
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                      </span>
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute -inset-2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
                                      </div>
                                    </Button>
                                  </motion.div>
                                  
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button 
                                      variant="outline"
                                      className="border-2 border-white/20 hover:border-white/40 text-white text-lg px-8 py-6 rounded-xl backdrop-blur-sm"
                                      onClick={togglePlayPause}
                                    >
                                      {isVideoPaused ? 
                                        <Play className="mr-2 h-5 w-5" /> : 
                                        <Pause className="mr-2 h-5 w-5" />
                                      }
                                      {isVideoPaused ? "Play" : "Pause"}
                                    </Button>
                                  </motion.div>
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Feature Points Below Video */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, staggerChildren: 0.1 }}
                          className="mt-8 grid grid-cols-3 gap-4"
                        >
                          {item.features.map((feature, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 + (idx * 0.1) }}
                              whileHover={{ scale: 1.05, backgroundColor: `rgba(${item.accentColor === 'blue' ? '59, 130, 246' : item.accentColor === 'emerald' ? '16, 185, 129' : '168, 85, 247'}, 0.2)` }}
                              className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50 hover:border-gray-700 transition-all duration-300"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`h-10 w-10 rounded-lg bg-${item.accentColor}-500/30 flex items-center justify-center`}>
                                  {React.createElement(feature.icon, { className: `h-5 w-5 text-${item.accentColor === 'blue' ? 'blue' : item.accentColor === 'emerald' ? 'emerald' : 'purple'}-400` })}
                                </div>
                                <span className="text-gray-300 font-medium">{feature.title}</span>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
                
                {/* Enhanced Navigation Dots */}
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
            </div>

            {/* Animated Success Stories */}
            <div className="mb-24">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                Success Stories
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {successStories.map((story, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    className="relative bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 backdrop-blur-sm hover:border-purple-500/30 transition-all group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="mb-4">
                        <div className="text-lg font-semibold mb-1 flex items-center">
                          {story.company}
                          <CheckCircle className="h-4 w-4 text-green-400 ml-2" />
                        </div>
                        <div className="text-xs text-purple-400 font-mono">{story.industry}</div>
                      </div>
                      
                      <blockquote className="text-gray-300 mb-4 relative pl-4 border-l-2 border-purple-500/50">
                        "{story.quote}"
                      </blockquote>
                      
                      <div className="flex items-center text-sm mt-4">
                        <div className="animate-pulse-slow bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                          {story.result}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Feature Highlights with Hover Effects */}
            <div className="mb-24">
              <motion.h2 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
              >
                Why Developers Love Zirak
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featureHighlights.map((feature, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-900/50 p-6 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all backdrop-blur-sm group overflow-hidden"
                  >
                    <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 transition-all group-hover:bg-purple-500/30">
                      <feature.icon className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Animated CTA Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="mb-16 text-center relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/20 border border-purple-500/30 p-8 backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-noise opacity-10" />
              <h2 className="text-2xl font-bold mb-4">Ready to transform your development workflow?</h2>
              <p className="text-gray-300 mb-6">Join thousands of developers building with Zirak today.</p>
              <Button 
                className="relative overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-6 text-lg rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg shadow-purple-500/20"
                onClick={() => router.push('/chat')}
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/10 to-transparent" />
              </Button>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Dashboard Access Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="py-12 bg-gradient-to-b from-black to-purple-900/20"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Access Your Dashboard</h2>
            <p className="text-gray-400 mt-2">
              Manage your account, check your usage, and more
            </p>
          </div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center"
          >
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:opacity-90 shadow-lg shadow-purple-500/20"
              asChild
            >
              <Link href="/user-dashboard">
                Go to My Dashboard
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-purple-500/50 hover:bg-purple-500/10"
              asChild
            >
              <Link href="/dashboard">
                Admin Dashboard
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Zirak</div>
              <div className="text-sm text-gray-400 mt-1">Accelerating software development with AI</div>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</Link>
              <Link href="/features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
            © 2023 Zirak. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Fixed floating chat button */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring" }}
        className="fixed bottom-8 right-8 z-50"
      >
        <Button 
          size="lg" 
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 text-white rounded-full h-16 w-16 shadow-lg shadow-purple-600/30 p-0 flex items-center justify-center"
          onClick={() => router.push('/chat')}
        >
          <MessageSquare className="h-8 w-8" />
          <span className="sr-only">Start Chat</span>
        </Button>
      </motion.div>
    </div>
  );
}

