"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Code, Braces, Terminal, MessageSquare, Bot, GitBranch, Server, Database, Globe, Blocks, Shield, Zap, Activity, Sparkles, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FeaturesPage() {
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Powerful AI-Driven Development Platform</h1>
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Zirak combines multiple AI agents with a seamless developer experience to help you build, test, and deploy software faster than ever before.
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Platform Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Intelligent Chat Interface</h3>
              <p className="text-gray-400">
                Communicate with multiple AI agents through a streamlined chat interface. Ask questions, request features, and get real-time responses.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Agent Workflow</h3>
              <p className="text-gray-400">
                Our platform utilizes multiple specialized AI agents that collaborate to solve complex development tasks and answer questions efficiently.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Code Generation</h3>
              <p className="text-gray-400">
                Generate production-ready code based on your requirements. Our AI understands context and produces optimized, secure implementations.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                <Terminal className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Integrated Terminal</h3>
              <p className="text-gray-400">
                Execute commands directly within the application. Run, test, and debug your code without switching between different tools.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center mb-4">
                <GitBranch className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">GitHub Integration</h3>
              <p className="text-gray-400">
                Connect directly to GitHub repositories. Import, modify, and contribute to your projects with intelligent assistance.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
              <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Web Preview</h3>
              <p className="text-gray-400">
                Instantly preview your web applications within the platform. See changes in real-time as you develop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Advanced Capabilities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Advanced Feature 1 */}
            <div className="bg-gray-800/30 p-8 rounded-xl border border-gray-700/30">
              <div className="flex items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-4">
                  <Braces className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Advanced Code Analysis</h3>
                  <p className="text-gray-400">
                    Our system analyzes existing codebases to understand structure, patterns, and dependencies, enabling context-aware suggestions and improvements.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-indigo-400 rounded-full mr-2"></span>
                  Semantic code understanding
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-indigo-400 rounded-full mr-2"></span>
                  Pattern recognition across projects
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-indigo-400 rounded-full mr-2"></span>
                  Automated code quality assessment
                </li>
              </ul>
            </div>
            
            {/* Advanced Feature 2 */}
            <div className="bg-gray-800/30 p-8 rounded-xl border border-gray-700/30">
              <div className="flex items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-rose-500/20 flex items-center justify-center mr-4">
                  <Server className="h-6 w-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Workflow Automation</h3>
                  <p className="text-gray-400">
                    Define custom workflows and let our AI agents handle repetitive tasks, from code generation to testing and deployment.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-rose-400 rounded-full mr-2"></span>
                  Custom workflow definitions
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-rose-400 rounded-full mr-2"></span>
                  Automated testing integration
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-rose-400 rounded-full mr-2"></span>
                  CI/CD pipeline assistance
                </li>
              </ul>
            </div>
            
            {/* Advanced Feature 3 */}
            <div className="bg-gray-800/30 p-8 rounded-xl border border-gray-700/30">
              <div className="flex items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-4">
                  <Shield className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Security-First Development</h3>
                  <p className="text-gray-400">
                    Our AI constantly monitors for security vulnerabilities, suggests secure coding practices, and helps protect sensitive data.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full mr-2"></span>
                  Vulnerability detection
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full mr-2"></span>
                  Secure coding recommendations
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full mr-2"></span>
                  Compliance checking automation
                </li>
              </ul>
            </div>
            
            {/* Advanced Feature 4 */}
            <div className="bg-gray-800/30 p-8 rounded-xl border border-gray-700/30">
              <div className="flex items-start mb-6">
                <div className="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center mr-4">
                  <Zap className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Performance Optimization</h3>
                  <p className="text-gray-400">
                    Get smart suggestions to optimize your code for better performance, reduced resource usage, and improved scalability.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-amber-400 rounded-full mr-2"></span>
                  Runtime performance analysis
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-amber-400 rounded-full mr-2"></span>
                  Memory usage optimization
                </li>
                <li className="flex items-center">
                  <span className="h-2 w-2 bg-amber-400 rounded-full mr-2"></span>
                  Scalability recommendations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Features */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-900/50 to-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Technical Specifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tech Feature 1 */}
            <div className="p-6 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
              <div className="flex items-center mb-4">
                <Blocks className="h-5 w-5 text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold">Frontend Technologies</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Next.js for SSR and routing</li>
                <li>React with TypeScript</li>
                <li>Tailwind CSS for styling</li>
                <li>WebSocket for real-time communication</li>
                <li>shadcn/ui component library</li>
              </ul>
            </div>
            
            {/* Tech Feature 2 */}
            <div className="p-6 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
              <div className="flex items-center mb-4">
                <Server className="h-5 w-5 text-green-400 mr-2" />
                <h3 className="text-lg font-semibold">Backend Architecture</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Python Flask server</li>
                <li>Socket.IO for bidirectional communication</li>
                <li>Multiple AI agent integration</li>
                <li>Conversation workflow management</li>
                <li>CORS support for cross-origin requests</li>
              </ul>
            </div>
            
            {/* Tech Feature 3 */}
            <div className="p-6 rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
              <div className="flex items-center mb-4">
                <Sparkles className="h-5 w-5 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold">AI Capabilities</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Multi-agent cooperative problem solving</li>
                <li>Context-aware code generation</li>
                <li>Natural language understanding</li>
                <li>Code analysis and optimization</li>
                <li>Security vulnerability detection</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to supercharge your development?</h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of developers who are building better software, faster with Zirak.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-lg w-full sm:w-auto">
              Get Started Free
            </Button>
            <Button variant="outline" className="border-white/20 hover:bg-white/10 px-8 py-6 text-lg w-full sm:w-auto">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">Zirak</div>
            <div className="text-sm text-gray-400">© 2023 Zirak. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
} 