"use client";

import { Navbar } from "@/components/landing/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SendIcon, Bot, User, Activity, Layers, Circle, CheckCircle2,
  FileText, Folder, FolderOpen, Terminal, Eye, Code,
  ArrowRight, ChevronRight, ChevronDown, AlertCircle, Play,
  Copy, CheckCheck, Trash2, RefreshCw, XCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket, Message, FileSystem, TerminalCommand } from "@/app/contexts/WebSocketContext";
import { useRouter } from 'next/navigation';
import path from 'path';

export default function ChatPage() {
  const router = useRouter();
  const webSocket = useWebSocket();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [activeTab, setActiveTab] = useState('workflow');
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  
  // Add terminal command handling
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalProcessing, setTerminalProcessing] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [editingFile, setEditingFile] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [completions, setCompletions] = useState<string[]>([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState(0);

  // Reference to the terminal input for focus management
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const fileEditorRef = useRef<HTMLTextAreaElement>(null);

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

  const [selectedFile, setSelectedFile] = useState<FileSystem | null>(null);

  // Reference to the message container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workflowEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Send initial prompt from localStorage on component mount
  useEffect(() => {
    const initialPrompt = localStorage.getItem('initial_prompt');
    if (initialPrompt) {
      webSocket.sendMessage(initialPrompt);
      localStorage.removeItem('initial_prompt');
    }
  }, []);

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

  // Automatically focus terminal input when terminal tab is selected
  useEffect(() => {
    if (activeTab === 'terminal') {
      // Use a small timeout to ensure the terminal is rendered
      const timer = setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

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

  // Function to copy terminal content
  const copyTerminalContent = () => {
    const terminalContent = webSocket.terminal.map(cmd => {
      return `$ ${cmd.command}\n${cmd.output || ''}`;
    }).join('\n');
    
    navigator.clipboard.writeText(terminalContent).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Handle tab key for auto-completion
  const handleTabCompletion = async () => {
    if (!terminalInput.trim() || editingFile) return;
    
    try {
      // Get the current cursor position in the input
      const cursorPos = terminalInputRef.current?.selectionStart || terminalInput.length;
      const textBeforeCursor = terminalInput.substring(0, cursorPos);
      
      // Get the current command and partial input for completion
      const parts = textBeforeCursor.split(' ');
      let command = parts[0];
      let completionTarget = '';
      
      // If we have more than one part, we're completing an argument
      if (parts.length > 1) {
        // Get the last part which is what we're completing
        completionTarget = parts[parts.length - 1];
      } else {
        // We're completing the command itself
        completionTarget = command;
      }
      
      console.log('Completion target:', completionTarget, 'full input:', terminalInput);
      
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tabCompletion: completionTarget,
          command: command, // Send the command to help with context-specific completions
          workingDirectory: webSocket.workingDirectory || '/project',
          userId: webSocket.activeWorkflowId || 'default_user'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Completion results:', result);
      
      if (result.completions && result.completions.length > 0) {
        // If only one completion, use it directly
        if (result.completions.length === 1) {
          if (parts.length > 1) {
            // Replace only the last part
            parts[parts.length - 1] = result.completions[0];
            // Join back everything before cursor with the completion
            const newInput = parts.join(' ') + terminalInput.substring(cursorPos);
            setTerminalInput(newInput);
          } else {
            // Replace the whole input
            setTerminalInput(result.completions[0] + terminalInput.substring(cursorPos));
          }
        } else {
          // Show multiple options
          setCompletions(result.completions);
          setShowCompletions(true);
          setSelectedCompletion(0);
        }
      }
    } catch (error) {
      console.error('Tab completion error:', error);
    }
  };

  // Select a completion option
  const selectCompletion = (completion: string) => {
    const cursorPos = terminalInputRef.current?.selectionStart || terminalInput.length;
    const textBeforeCursor = terminalInput.substring(0, cursorPos);
    const parts = textBeforeCursor.split(' ');
    
    if (parts.length > 1) {
      // Replace the last part with the selected completion
      parts[parts.length - 1] = completion;
      setTerminalInput(parts.join(' ') + terminalInput.substring(cursorPos));
    } else {
      // Replace the whole command
      setTerminalInput(completion + terminalInput.substring(cursorPos));
    }
    
    setShowCompletions(false);
    
    // Focus back on input
    setTimeout(() => {
      terminalInputRef.current?.focus();
    }, 10);
  };

  // Save file content and exit edit mode
  const saveFileContent = async () => {
    if (!editingFile || !filePath) return;
    
    try {
      const response = await fetch('/api/terminal/interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          command: `vim ${path.basename(filePath)}`,
          fileContent: fileContent,
          workingDirectory: path.dirname(filePath),
          userId: webSocket.activeWorkflowId || 'default_user'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Add the result to terminal
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: `vim ${path.basename(filePath)} (saved)`,
        output: result.output,
        timestamp: new Date().toISOString()
      });
      
      // Update file system if files were modified
      if (result.fileSystemChanged) {
        fetchFileSystem();
      }
      
      // Exit edit mode
      setEditingFile(false);
      setFileContent('');
      setFilePath('');
      
      // Refocus terminal input
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 10);
      
    } catch (error) {
      console.error('Error saving file:', error);
      
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: `vim ${path.basename(filePath)} (error)`,
        output: `Error saving file: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        error: String(error),
        exitCode: 1
      });
      
      // Exit edit mode even if there was an error
      setEditingFile(false);
      setFileContent('');
      setFilePath('');
    }
  };

  // Cancel file editing without saving
  const cancelFileEditing = () => {
    setEditingFile(false);
    setFileContent('');
    setFilePath('');
    
    webSocket.addTerminalCommand({
      id: uuidv4(),
      command: `vim ${path.basename(filePath)} (cancelled)`,
      output: 'Changes discarded.',
      timestamp: new Date().toISOString()
    });
    
    // Refocus terminal input
    setTimeout(() => {
      terminalInputRef.current?.focus();
    }, 10);
  };

  // Function to execute terminal command
  const executeTerminalCommand = async (command: string) => {
    if (!command.trim() || terminalProcessing) return;
    
    setTerminalProcessing(true);
    
    // Handle clear command locally
    if (command.trim() === 'clear') {
      webSocket.clearTerminal();
      setShowWelcomeMessage(false);
      setTerminalProcessing(false);
      setTerminalInput('');
      
      // Refocus the terminal input after clearing
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 10);
      return;
    }
    
    // Support for vim and other interactive terminal programs
    if (command.trim().startsWith('vim ') || command.trim().startsWith('nano ') || 
        command.trim().startsWith('emacs ') || command.trim() === 'top') {
      
      try {
        // Add the command to terminal history
        const newCommand: TerminalCommand = {
          id: uuidv4(),
          command: command,
          output: "Starting interactive session...",
          timestamp: new Date().toISOString()
        };
        
        webSocket.addTerminalCommand(newCommand);
        
        // Use a special endpoint for interactive terminal sessions
        const response = await fetch('/api/terminal/interactive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            command,
            workingDirectory: webSocket.workingDirectory || '/project',
            userId: webSocket.activeWorkflowId || 'default_user'
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check if this is an editable file
        if (result.editable && result.filePath) {
          // Enter edit mode
          setEditingFile(true);
          setFileContent(result.fileContent || '');
          setFilePath(result.filePath);
          
          // Focus the file editor after rendering
          setTimeout(() => {
            fileEditorRef.current?.focus();
          }, 50);
        } else {
          // Update the command with the result for non-editable commands
          webSocket.updateTerminalCommand({
            ...newCommand,
            output: result.output || "Interactive session completed",
            error: result.error,
            exitCode: result.exitCode
          });
        }
        
        // Update working directory if changed by the command
        if (result.newWorkingDirectory) {
          webSocket.setWorkingDirectory(result.newWorkingDirectory);
        }
        
        // Update file system if files were modified
        if (result.fileSystemChanged) {
          fetchFileSystem();
        }
        
      } catch (error) {
        console.error('Interactive terminal error:', error);
        
        webSocket.updateLastTerminalCommand({
          error: `Error with interactive terminal: ${error instanceof Error ? error.message : String(error)}`,
          exitCode: 1
        });
      } finally {
        setTerminalProcessing(false);
        setTerminalInput('');
        
        // Don't focus the input if we're in edit mode
        if (!editingFile) {
          setTimeout(() => {
            terminalInputRef.current?.focus();
          }, 10);
        }
      }
      
      return;
    }
    
    try {
      // Add the command to terminal history immediately
      const newCommand: TerminalCommand = {
        id: uuidv4(),
        command: command,
        output: "Processing...",
        timestamp: new Date().toISOString()
      };
      
      webSocket.addTerminalCommand(newCommand);
      
      // Send the command to the server
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          command,
          workingDirectory: webSocket.workingDirectory || '/project',
          userId: webSocket.activeWorkflowId || 'default_user' // Use workflow ID as user ID to isolate projects
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update the command with the result
      webSocket.updateTerminalCommand({
        ...newCommand,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode
      });
      
      // Update working directory if changed by the command
      if (result.newWorkingDirectory) {
        webSocket.setWorkingDirectory(result.newWorkingDirectory);
      }
      
      // Update file system if files were modified
      if (result.fileSystemChanged) {
        // Fetch updated file system
        fetchFileSystem();
      }
      
    } catch (error) {
      console.error('Terminal command error:', error);
      
      // Update with error message
      webSocket.updateLastTerminalCommand({
        error: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1
      });
    } finally {
      setTerminalProcessing(false);
      setTerminalInput('');
      
      // Refocus the terminal input after command execution
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 10);
    }
  };
  
  // Function to fetch updated file system
  const fetchFileSystem = async () => {
    try {
      const response = await fetch('/api/filesystem', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include the user ID to get files from their virtual environment
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      setFileSystem(result.fileSystem);
    } catch (error) {
      console.error('Failed to fetch file system:', error);
    }
  };

  // Handle terminal input submission
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTerminalCommand(terminalInput);
  };

  // Function to focus the terminal input
  const focusTerminalInput = () => {
    terminalInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none z-10">
        <Navbar />
      </div>
      
      <div className="flex-1 overflow-hidden pt-16">
        {/* Main Workspace Layout */}
        <div className="flex h-[calc(100vh-64px)]">
          {/* Chat Section */}
          <div className={`flex flex-col ${showWorkspace ? 'w-1/2 border-r' : 'w-full'} transition-all duration-300`}>
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center">
                <Bot className="h-5 w-5 mr-2 text-blue-500" />
                <h2 className="font-semibold">Zirak AI Chat</h2>
              </div>
              <div className="flex items-center space-x-2">
                {!showWorkspace && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowWorkspace(true)}
                    className="h-8 px-2 border-blue-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50"
                  >
                    <Eye className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-xs">Workspace</span>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
              <div className="space-y-6 max-w-3xl mx-auto">
                {webSocket.messages.length === 0 ? (
                  <div className="text-center py-10">
                    <Bot className="mx-auto h-12 w-12 text-blue-500 mb-3 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Start a conversation</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask Zirak a question to begin</p>
                  </div>
                ) : (
                  webSocket.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role !== 'user' && (
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                          <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                            : 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {renderMessageContent(message.content)}
                        </div>
                        <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                          {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <div className="border-t p-4 bg-white dark:bg-gray-900">
              {needsClarification && (
                <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 text-sm text-amber-800 dark:text-amber-200 rounded">
                  <p className="font-medium">{webSocket.inputPrompt || "More information needed"}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex w-full space-x-2">
                <div className="relative flex-1">
                  <Input
                    id="message-input"
                    className={`flex-1 pr-10 py-6 rounded-full pl-4 ${
                      needsClarification ? 'border-amber-500 focus-visible:ring-amber-500' : 'focus-visible:ring-blue-500'
                    }`}
                    placeholder={webSocket.inputRequired 
                      ? "Type your response..." 
                      : "Type a message..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full h-12 w-12 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Circle className="animate-spin" size={20} />
                  ) : (
                    <SendIcon size={20} />
                  )}
                </Button>
              </form>
            </div>
          </div>
          
          {/* Workspace Section */}
          {showWorkspace && (
            <div className="w-1/2 flex flex-col">
              <div className="flex items-center p-2 border-b bg-muted/30">
                <div className="flex-1 grid grid-cols-4 gap-1 bg-muted rounded-md p-0.5">
                  <button
                    className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
                      activeTab === 'workflow' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => setActiveTab('workflow')}
                  >
                    Workflow
                  </button>
                  <button
                    className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
                      activeTab === 'files' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => setActiveTab('files')}
                  >
                    Files
                  </button>
                  <button
                    className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
                      activeTab === 'terminal' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => setActiveTab('terminal')}
                  >
                    Terminal
                  </button>
                  <button
                    className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
                      activeTab === 'editor' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => setActiveTab('editor')}
                  >
                    Editor
                  </button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowWorkspace(false)}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {activeTab === 'workflow' && (
                  <div className="h-full overflow-auto p-4">
                    {webSocket.workflowSteps.length === 0 ? (
                      <div className="text-center p-4 text-gray-500 h-full flex flex-col items-center justify-center">
                        <Activity className="h-12 w-12 mb-2 text-gray-400" />
                        <p>No workflow steps yet. Start by sending a message.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {webSocket.workflowSteps.map((step, index) => (
                          <div
                            key={step.id}
                            className={`rounded-lg border p-3 ${
                              step.status === 'active' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' :
                              step.status === 'complete' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
                              step.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' :
                              'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                {step.status === 'active' ? <Circle className="h-5 w-5 text-blue-500" /> :
                                 step.status === 'complete' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                 step.status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> :
                                 <Circle className="h-5 w-5 text-yellow-500" />}
                              </div>
                              <div className="flex-1">
                                <div className="mb-1 flex items-center">
                                  <span className="font-medium" style={{ color: getAgentColor(step.agent) }}>
                                    {step.agent}
                                  </span>
                                  <span className="ml-auto text-xs text-gray-500">
                                    {new Date(step.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-sm">
                                  {renderMessageContent(step.message)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={workflowEndRef} />
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'files' && (
                  <div className="h-full overflow-auto">
                    <div className="p-2 bg-muted/30 border-b flex items-center">
                      <Folder className="h-4 w-4 mr-2 text-amber-500" />
                      <span className="text-xs font-medium">Project Files</span>
                    </div>
                    <div className="p-2">
                      {renderFileSystem(fileSystem)}
                    </div>
                  </div>
                )}
                
                {activeTab === 'terminal' && (
                  <div className="h-full flex flex-col overflow-hidden">
                    <div className="p-2 bg-[#1D1E1F] text-white flex items-center justify-between border-b border-gray-700">
                      <div className="flex items-center">
                        <Terminal className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-xs font-medium">Terminal</span>
                        <span className="text-xs ml-2 text-gray-500">
                          {webSocket.workingDirectory 
                            ? `~/projects/${path.relative(webSocket.workingDirectory, '/project')}`
                            : '~/projects'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={copyTerminalContent}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                          title="Copy terminal content"
                        >
                          {copiedText ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                        <button 
                          onClick={() => {
                            webSocket.clearTerminal();
                            setShowWelcomeMessage(false);
                            setTimeout(() => {
                              terminalInputRef.current?.focus();
                            }, 10);
                          }}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                          title="Clear terminal"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            fetchFileSystem();
                            webSocket.addTerminalCommand({
                              id: uuidv4(),
                              command: "# Refreshed file system",
                              output: "File system refreshed",
                              timestamp: new Date().toISOString()
                            });
                            setTimeout(() => {
                              terminalInputRef.current?.focus();
                            }, 10);
                          }}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                          title="Refresh file system"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (editingFile) {
                              cancelFileEditing();
                            } else {
                              setActiveTab('files');
                            }
                          }}
                          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
                          title={editingFile ? "Cancel editing" : "Switch to files"}
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    </div>
                    {editingFile ? (
                      <div className="flex-1 flex flex-col bg-[#1E1E1E] overflow-hidden">
                        <div className="p-2 bg-[#252526] text-white flex items-center justify-between border-b border-gray-700">
                          <div className="flex items-center">
                            <Code className="h-4 w-4 mr-2 text-blue-400" />
                            <span className="text-xs font-medium truncate">
                              Editing: {filePath.split('/').pop()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={saveFileContent}
                              className="h-7 py-0 px-2 text-xs bg-transparent border-gray-600 hover:bg-gray-700 text-white"
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={cancelFileEditing}
                              className="h-7 py-0 px-2 text-xs bg-transparent border-gray-600 hover:bg-gray-700 text-white"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                        <textarea
                          ref={fileEditorRef}
                          className="flex-1 p-4 bg-[#1E1E1E] text-gray-200 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          spellCheck="false"
                        />
                      </div>
                    ) : (
                      <div 
                        className="flex-1 overflow-auto p-0 font-mono bg-black text-gray-200 rounded-none terminal-scrollbar mac-terminal"
                        style={{ 
                          tabSize: 4
                        }}
                        onClick={focusTerminalInput}
                      >
                        <div className="p-3 min-h-full">
                          {webSocket.terminal.length === 0 && !showWelcomeMessage ? (
                            <div className="flex items-center text-sm whitespace-nowrap">
                              <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                              <span className="text-white mx-1">:</span>
                              <span className="text-[#61AFEF]">~/projects</span>
                              <span className="text-white mx-1">$ </span>
                              <span className="terminal-cursor"></span>
                            </div>
                          ) : webSocket.terminal.length === 0 && showWelcomeMessage ? (
                            <div className="text-left p-4 h-full">
                              <div className="mb-4">
                                <span className="text-gray-300">Last login: {new Date().toLocaleString()} on ttys001</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-green-400">Welcome to Zirak Terminal</span>
                              </div>
                              <div className="mb-4 text-xs text-gray-400">
                                <p>This is an isolated environment for your project.</p>
                                <p>All commands will execute in your virtual workspace.</p>
                              </div>
                              <div className="flex items-center text-sm whitespace-nowrap">
                                <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                                <span className="text-white mx-1">:</span>
                                <span className="text-[#61AFEF]">~/projects</span>
                                <span className="text-white mx-1">$ </span>
                                <span className="terminal-cursor"></span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-200 whitespace-pre-line">
                              {showWelcomeMessage && webSocket.terminal.length > 0 && (
                                <div className="mb-4">
                                  <span className="text-gray-300">Last login: {new Date().toLocaleString()} on ttys001</span>
                                </div>
                              )}
                              {webSocket.terminal.map((cmd, index) => (
                                <div key={cmd.id}>
                                  <div className="flex items-center text-sm whitespace-nowrap">
                                    <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                                    <span className="text-white mx-1">:</span>
                                    <span className="text-[#61AFEF]">
                                      ~/projects{webSocket.workingDirectory ? 
                                        `/${webSocket.workingDirectory.split('/').pop()}` : ''}
                                    </span>
                                    <span className="text-white mx-1">$ </span>
                                    <span className="text-gray-100">{cmd.command}</span>
                                  </div>
                                  {cmd.output && (
                                    <pre className={`${cmd.error ? 'text-[#E06C75]' : 'text-gray-200'} mt-0 mb-1 whitespace-pre-wrap text-xs`}>
                                      {cmd.output}
                                    </pre>
                                  )}
                                  {cmd.exitCode !== undefined && cmd.exitCode !== 0 && (
                                    <div className="text-xs text-[#E06C75]">
                                      Exit code: {cmd.exitCode}
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center text-sm whitespace-nowrap mt-2">
                                <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                                <span className="text-white mx-1">:</span>
                                <span className="text-[#61AFEF]">
                                  ~/projects{webSocket.workingDirectory ? 
                                    `/${webSocket.workingDirectory.split('/').pop()}` : ''}
                                </span>
                                <span className="text-white mx-1">$ </span>
                                {terminalProcessing ? (
                                  <span className="text-gray-500">Processing...</span>
                                ) : (
                                  terminalInput ? <span className="text-gray-100">{terminalInput}</span> : null
                                )}
                                {!terminalProcessing && !terminalInput && (
                                  <span className="terminal-cursor"></span>
                                )}
                              </div>
                              
                              {/* Auto-completion dropdown */}
                              {showCompletions && completions.length > 0 && (
                                <div className="absolute bg-gray-800 border border-gray-700 rounded shadow-lg mt-1 max-h-48 overflow-y-auto z-10" style={{ left: '20px', top: 'auto' }}>
                                  <div className="text-xs text-gray-400 p-1 border-b border-gray-700">
                                    Tab completions ({completions.length})
                                  </div>
                                  {completions.map((item, index) => (
                                    <div 
                                      key={index}
                                      className={`px-3 py-1 cursor-pointer font-mono text-sm ${
                                        index === selectedCompletion ? 'bg-blue-900 text-white' : 'hover:bg-gray-700'
                                      }`}
                                      onClick={() => selectCompletion(item)}
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <div ref={terminalEndRef} />
                        </div>
                      </div>
                    )}
                    {!editingFile && (
                      <div className="border-t border-gray-800 bg-black">
                        <form onSubmit={handleTerminalSubmit} className="flex">
                          <Input
                            ref={terminalInputRef}
                            type="text"
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            placeholder=""
                            className="flex-1 bg-black border-0 text-transparent caret-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-8 p-0"
                            disabled={terminalProcessing}
                            autoComplete="off"
                            spellCheck="false"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (terminalInput.trim() && !terminalProcessing) {
                                  setShowCompletions(false);
                                  executeTerminalCommand(terminalInput);
                                }
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                handleTabCompletion();
                              } else if (e.key === 'ArrowUp' && showCompletions) {
                                e.preventDefault();
                                setSelectedCompletion(prev => (prev > 0 ? prev - 1 : completions.length - 1));
                              } else if (e.key === 'ArrowDown' && showCompletions) {
                                e.preventDefault();
                                setSelectedCompletion(prev => (prev < completions.length - 1 ? prev + 1 : 0));
                              } else if (e.key === 'Escape' && showCompletions) {
                                e.preventDefault();
                                setShowCompletions(false);
                              } else if (e.key === 'Enter' && showCompletions) {
                                e.preventDefault();
                                selectCompletion(completions[selectedCompletion]);
                              }
                            }}
                          />
                        </form>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'editor' && (
                  <div className="h-full flex flex-col overflow-hidden">
                    {!selectedFile ? (
                      <div className="h-full flex flex-col items-center justify-center p-4 text-gray-500">
                        <FileText className="h-12 w-12 mb-2 text-gray-400" />
                        <p>Select a file from the Files tab to view or edit it.</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-2 bg-muted/30 border-b flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-xs font-medium truncate">{selectedFile.path}</span>
                        </div>
                        <div className="flex-1 overflow-auto">
                          <pre className="p-4 bg-gray-100 dark:bg-gray-900 w-full h-full text-sm font-mono overflow-auto border-0 rounded-none">
                            {selectedFile.content || 'No content'}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 