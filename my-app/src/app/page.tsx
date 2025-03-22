"use client";

import { Navbar } from "@/components/landing/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SendIcon, Bot, User, Activity, Layers, Circle, CheckCircle2,
  FileText, Folder, FolderOpen, Terminal, Eye, Code,
  ArrowRight, ChevronRight, ChevronDown, LogIn, Mail, Lock
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket, Message, WorkflowStep, FileSystem, TerminalCommand } from "@/app/contexts/WebSocketContext";

export default function Home() {
  const webSocket = useWebSocket();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [landingPage, setLandingPage] = useState(true);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  
  // Return the debug component to show connection status
  if (debugVisible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">WebSocket Connection Debug</h1>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span>Connection Status:</span>
              <span className={`px-2 py-1 rounded text-white ${webSocket.connected ? 'bg-green-500' : 'bg-red-500'}`}>
                {webSocket.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={() => setDebugVisible(false)} className="w-full">
              Continue to App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const [fileSystem, setFileSystem] = useState<FileSystem[]>([
    {
      name: 'project',
      type: 'directory',
      path: '/project',
      expanded: true,
      children: [
        {
          name: 'README.md',
          type: 'file',
          path: '/project/README.md',
          content: '# Project\n\nThis is a sample project.'
        }
      ]
    }
  ]);
  const [terminalCommands, setTerminalCommands] = useState<TerminalCommand[]>([
    {
      id: uuidv4(),
      command: 'ls -la',
      output: 'total 8\ndrwxr-xr-x  3 user  staff   96 Mar 17 19:24 .\ndrwxr-xr-x  3 user  staff   96 Mar 17 19:24 ..\n-rw-r--r--  1 user  staff   41 Mar 17 19:24 README.md',
      timestamp: new Date().toISOString()
    }
  ]);
  const [selectedFile, setSelectedFile] = useState<FileSystem | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Reference to the message container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workflowEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webSocket.messages]);

  // Scroll workflow to bottom whenever steps change
  useEffect(() => {
    if (showWorkflow && webSocket.workflowSteps.length > 0) {
      workflowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [webSocket.workflowSteps, showWorkflow]);

  // Scroll terminal to bottom whenever commands change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webSocket.terminal]);

  // Check if workflow contains clarification requests
  useEffect(() => {
    const needsInput = webSocket.inputRequired || false;

    if (needsInput && !needsClarification) {
      setNeedsClarification(true);
    } else if (!needsInput && needsClarification) {
      setNeedsClarification(false);
    }
  }, [webSocket.inputRequired, needsClarification]);

  // Show workspace after first message is sent
  useEffect(() => {
    if (webSocket.messages.length > 1 && !showWorkspace) {
      setShowWorkspace(true);
      setLandingPage(false);
    }
  }, [webSocket.messages, showWorkspace]);

  // Helper function to add a message
  const addMessage = (message: Message) => {
    // Handled by the WebSocket context
  };

  // Function to generate unique IDs
  const generateUniqueId = () => uuidv4();

  // Handle the initial prompt submission
  const handleInitialPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Send message through WebSocket
      webSocket.sendMessage(input);
      
      // Update UI
      setInput('');
      setLandingPage(false);
      setShowWorkspace(true);
      // Set initial workflow step
      setShowWorkflow(true);
      setActiveTab('workflow');
    } catch (error) {
      console.error('Error sending initial message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    setIsLoading(true);
    
    // If we need input for a workflow, provide it instead of starting a new one
    if (webSocket.inputRequired) {
      webSocket.sendUserInputResponse(input);
    } else {
      // Otherwise, send a new message
      webSocket.sendMessage(input);
    }
    
    setInput('');
    
    // Show workspace after first message is sent
    setShowWorkspace(true);
    setShowWorkflow(true);
  };

  // Handle login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple mock login
    if (loginEmail && loginPassword) {
      setIsLoggedIn(true);
      setShowLogin(false);
    }
  };

  // Update file system with new files
  const updateFileSystem = (newFiles: FileSystem[]) => {
    setFileSystem(prevFiles => {
      const updatedFiles = [...prevFiles];
      
      newFiles.forEach(file => {
        // Find if parent directory exists
        const pathParts = file.path.split('/').filter(Boolean);
        const fileName = pathParts.pop() || '';
        const dirPath = '/' + pathParts.join('/');
        
        // Add file to appropriate directory
        // This is a simplified implementation - in a real app, 
        // you would need to handle nested paths properly
        addFileToSystem(updatedFiles, dirPath, { ...file, name: fileName });
      });
      
      return updatedFiles;
    });
  };

  // Helper to add a file to the file system
  const addFileToSystem = (files: FileSystem[], dirPath: string, file: FileSystem) => {
    // Simplified implementation - would need recursion for deeply nested paths
    const rootDir = files.find(f => f.type === 'directory' && f.path === dirPath);
    if (rootDir) {
      rootDir.children = rootDir.children || [];
      rootDir.children.push(file);
    } else {
      // Create directories if they don't exist
      const pathParts = dirPath.split('/').filter(Boolean);
      let currentPath = '';
      
      // Build path incrementally
      for (const part of pathParts) {
        currentPath += '/' + part;
        const existingDir = files.find(f => f.path === currentPath);
        
        if (!existingDir) {
          const newDir: FileSystem = {
            name: part,
            type: 'directory',
            path: currentPath,
            expanded: true,
            children: []
          };
          files.push(newDir);
        }
      }
      
      // Add file to the last directory
      const targetDir = files.find(f => f.path === dirPath);
      if (targetDir) {
        targetDir.children = targetDir.children || [];
        targetDir.children.push(file);
      } else {
        // If all else fails, add to root
        files.push(file);
      }
    }
  };

  // Toggle directory expansion
  const toggleDirectory = (path: string) => {
    setFileSystem(prevFiles => {
      const newFiles = [...prevFiles];
      
      const toggleDir = (items: FileSystem[]) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].path === path && items[i].type === 'directory') {
            items[i] = { ...items[i], expanded: !items[i].expanded };
            return true;
          }
          
          // Check if children exists and is an array before trying to iterate
          if (items[i].children) {
            const children = items[i].children;
            if (children && children.length > 0) {
              if (toggleDir(children)) {
                return true;
              }
            }
          }
        }
        
        return false;
      };
      
      toggleDir(newFiles);
      return newFiles;
    });
  };

  // Select a file to view its contents
  const selectFile = (file: FileSystem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setActiveTab('editor');
    }
  };

  // Render message content with markdown support
  const renderMessageContent = (content: string) => {
    return (
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    );
  };

  // Get icon for an agent
  const getAgentIcon = (agentName: string) => {
    const icons = {
      'System': <Activity size={16} />,
      'LLM': <Bot size={16} />,
      'Assistant': <Bot size={16} />,
      'UserProxyAgent': <User size={16} />,
      'ClarificationAgent': <Circle size={16} />,
      'LLM_Agent': <Bot size={16} />,
      'Step_Generator': <Layers size={16} />
    };
    
    return icons[agentName as keyof typeof icons] || <Bot size={16} />;
  };

  // Get color for an agent
  const getAgentColor = (agentName: string) => {
    const colors = {
      'System': 'text-gray-500',
      'LLM': 'text-blue-500',
      'Assistant': 'text-green-500',
      'UserProxyAgent': 'text-amber-500',
      'ClarificationAgent': 'text-purple-500',
      'LLM_Agent': 'text-blue-500',
      'Step_Generator': 'text-indigo-500'
    };
    
    return colors[agentName as keyof typeof colors] || 'text-gray-500';
  };

  // Render file system tree
  const renderFileSystem = (items: FileSystem[], level: number = 0) => {
    return items.map(item => (
      <div key={item.path} className="file-system-item">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
            selectedFile?.path === item.path ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => item.type === 'directory' ? toggleDirectory(item.path) : selectFile(item)}
        >
          {item.type === 'directory' ? (
            <>
              {item.expanded ? (
                <ChevronDown size={16} className="mr-1" />
              ) : (
                <ChevronRight size={16} className="mr-1" />
              )}
              {item.expanded ? (
                <FolderOpen size={16} className="mr-2 text-amber-500" />
              ) : (
                <Folder size={16} className="mr-2 text-amber-500" />
              )}
            </>
          ) : (
            <FileText size={16} className="ml-5 mr-2 text-blue-500" />
          )}
          <span className="text-sm truncate">{item.name}</span>
        </div>
        
        {item.type === 'directory' && item.expanded && item.children && (
          <div className="file-children">
            {renderFileSystem(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Render the main UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Landing Page or Main Interface */}
      {landingPage ? (
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
      ) : (
        <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* Chat Section */}
          <div className="lg:col-span-6 flex flex-col h-[calc(100vh-130px)]">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {webSocket.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 
                          ${message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 dark:bg-gray-800 dark:text-white'
                          }
                        `}
                      >
                        {renderMessageContent(message.content)}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex w-full space-x-2">
                  <Input
                    id="message-input"
                    className={`flex-1 ${needsClarification ? 'border-amber-500 animate-pulse' : ''}`}
                    placeholder={webSocket.inputRequired 
                      ? webSocket.inputPrompt || "Please provide more information..." 
                      : "Type your message..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <Circle className="animate-spin" size={16} />
                    ) : (
                      <SendIcon size={16} />
                    )}
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </div>
          
          {/* Workspace Section */}
          {showWorkspace && (
            <div className="lg:col-span-6 flex flex-col h-[calc(100vh-130px)]">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="border-b p-3">
                  <Tabs 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="workflow">Workflow</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="terminal">Terminal</TabsTrigger>
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  <TabsContent value="workflow" className="h-full m-0">
                    <div className="p-4 space-y-3">
                      {webSocket.workflowSteps.length > 0 ? (
                        webSocket.workflowSteps.map((step, index) => (
                          <div 
                            key={index} 
                            className={`border-l-2 pl-3 py-2 
                              ${step.status === 'active' 
                                ? 'border-amber-500 animate-pulse' 
                                : 'border-green-500'
                              }`}
                          >
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </div>
                            <div className={`font-semibold flex items-center ${getAgentColor(step.agent)}`}>
                              {getAgentIcon(step.agent)}
                              <span className="ml-1">{step.agent}</span>
                            </div>
                            <div className="mt-1">{step.message}</div>
                            <div className="flex items-center mt-1 text-xs">
                              {step.status === 'active' ? (
                                <span className="flex items-center text-amber-500">
                                  <Circle size={12} className="mr-1" /> In progress
                                </span>
                              ) : (
                                <span className="flex items-center text-green-500">
                                  <CheckCircle2 size={12} className="mr-1" /> Completed
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                          No workflow steps yet. Start a conversation to see the workflow.
                        </div>
                      )}
                      <div ref={workflowEndRef} />
                    </div>
                  </TabsContent>
                  <TabsContent value="files" className="h-full m-0">
                    <div className="p-2">
                      {renderFileSystem(fileSystem)}
                    </div>
                  </TabsContent>
                  <TabsContent value="terminal" className="h-full m-0">
                    <div className="bg-black text-green-400 p-4 font-mono text-sm h-full overflow-auto">
                      {webSocket.terminal.map((cmd, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex">
                            <span className="text-blue-400 mr-2">$</span>
                            <span>{cmd.command}</span>
                          </div>
                          <pre className="whitespace-pre-wrap mt-1">{cmd.output}</pre>
                        </div>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>
                  </TabsContent>
                  <TabsContent value="editor" className="h-full m-0">
                    {selectedFile ? (
                      <div className="h-full flex flex-col">
                        <div className="bg-gray-100 dark:bg-gray-800 p-2 text-sm font-medium border-b">
                          {selectedFile.path}
                        </div>
                        <pre className="bg-white dark:bg-gray-900 p-4 text-sm font-mono overflow-auto flex-1">
                          {selectedFile.content || '// No content'}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Select a file from the Files tab to view its contents
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <Input 
                      id="email" 
                      type="email" 
                      className="pl-10" 
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-10" 
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <LogIn size={16} className="mr-2" />
                  Login
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => setShowLogin(false)}>
                Continue as Guest
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
