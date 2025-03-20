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

// Message type definition
type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
};

// Workflow step type definition
type WorkflowStep = {
  timestamp: string;
  agent: string;
  action: string;
  message: string;
  status: 'in_progress' | 'completed';
  speaker?: string;
  next_speaker?: string;
  content?: string;
};

// File system item type definition
type FileSystemItem = {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: FileSystemItem[];
  expanded?: boolean;
};

// Terminal command type definition
type TerminalCommand = {
  command: string;
  output: string;
  timestamp: Date;
};

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-message',
      content: "Hello! I'm Zirak, your AI assistant. How can I help you today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [landingPage, setLandingPage] = useState(true);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([
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
      command: 'ls -la',
      output: 'total 8\ndrwxr-xr-x  3 user  staff   96 Mar 17 19:24 .\ndrwxr-xr-x  3 user  staff   96 Mar 17 19:24 ..\n-rw-r--r--  1 user  staff   41 Mar 17 19:24 README.md',
      timestamp: new Date()
    }
  ]);
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
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
  }, [messages]);

  // Scroll workflow to bottom whenever steps change
  useEffect(() => {
    if (showWorkflow) {
      workflowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [workflowSteps, showWorkflow]);

  // Scroll terminal to bottom whenever commands change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalCommands]);

  // Check if workflow contains clarification requests
  useEffect(() => {
    const hasClarification = workflowSteps.some(
      step => step.agent === 'ClarificationAgent' && step.status === 'in_progress'
    );

    if (hasClarification && !needsClarification) {
      setNeedsClarification(true);
      // Switch to workflow tab to show the clarification request
      setActiveTab('workflow');
      // Flash the input to draw attention
      const inputElement = document.getElementById('message-input');
      if (inputElement) {
        inputElement.classList.add('animate-pulse', 'border-amber-500');
        setTimeout(() => {
          inputElement.classList.remove('animate-pulse', 'border-amber-500');
        }, 2000);
      }
    } else if (!hasClarification && needsClarification) {
      setNeedsClarification(false);
    }
  }, [workflowSteps, needsClarification]);

  // Function to connect to the Zirak backend via our Flask API
  const sendMessageToZirak = async (userMessage: string): Promise<{
    response: string,
    workflow_steps: WorkflowStep[],
    files_created?: FileSystemItem[],
    terminal_commands?: TerminalCommand[]
  }> => {
    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);

      if (data.success) {
        // Extract file and terminal information from response
        const fileInfo = extractFileInfo(data.response);
        const terminalInfo = extractTerminalCommands(data.response);

        // Process workflow steps from the API
        let steps = data.workflow_steps || [];

        // If no workflow steps are provided, but we have a raw_log, parse it
        if ((steps.length === 0 || !steps.some((step: WorkflowStep) => step.agent === 'ClarificationAgent')) && data.raw_log) {
          console.log("Parsing raw log for workflow steps");
          steps = parseRawLog(data.raw_log, userMessage);

          // Extract terminal commands from raw log if present
          const extractedCommands = extractTerminalCommandsFromRawLog(data.raw_log);
          if (extractedCommands.length > 0) {
            terminalInfo.commands = [...terminalInfo.commands, ...extractedCommands];
          }
        }

        // If still no steps after parsing, create mock steps
        if (steps.length === 0) {
          console.log("No workflow steps received, creating mock steps for testing");
          steps = [
            {
              timestamp: new Date().toISOString(),
              agent: "System",
              action: "Query received",
              message: `Processing query: "${userMessage}"`,
              status: "completed"
            },
            {
              timestamp: new Date(Date.now() + 1000).toISOString(),
              agent: "LLM",
              action: "Generating response",
              message: "Analyzing request and formulating answer",
              status: "completed"
            },
            {
              timestamp: new Date(Date.now() + 2000).toISOString(),
              agent: "Assistant",
              action: "Response ready",
              message: "Response prepared and ready to display",
              status: "completed"
            }
          ];
        }

        return {
          response: data.response,
          workflow_steps: steps,
          files_created: fileInfo.files,
          terminal_commands: terminalInfo.commands
        };
      } else {
        throw new Error(data.response || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error calling Zirak API:', error);
      throw error;
    }
  };

  // Extract file information from response
  const extractFileInfo = (response: string): { files: FileSystemItem[] } => {
    // This is a simple mock implementation
    // In a real scenario, you would parse the response to extract actual file information

    // Check if response mentions creating files
    if (response.toLowerCase().includes('create') && response.toLowerCase().includes('file')) {
      // Mock file creation based on response content
      if (response.toLowerCase().includes('html')) {
        return {
          files: [
            {
              name: 'index.html',
              type: 'file',
              path: '/project/index.html',
              content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>'
            }
          ]
        };
      } else if (response.toLowerCase().includes('python') || response.toLowerCase().includes('.py')) {
        return {
          files: [
            {
              name: 'main.py',
              type: 'file',
              path: '/project/main.py',
              content: 'def main():\n    print("Hello, world!")\n\nif __name__ == "__main__":\n    main()'
            }
          ]
        };
      } else if (response.toLowerCase().includes('javascript') || response.toLowerCase().includes('.js')) {
        return {
          files: [
            {
              name: 'script.js',
              type: 'file',
              path: '/project/script.js',
              content: 'console.log("Hello, world!");'
            }
          ]
        };
      }
    }

    // Default: no files created
    return { files: [] };
  };

  // Extract terminal commands from response
  const extractTerminalCommands = (response: string): { commands: TerminalCommand[] } => {
    // This is a simple mock implementation
    // In a real scenario, you would parse the response to extract actual terminal commands

    const commands: TerminalCommand[] = [];

    // Check for code blocks that might contain terminal commands
    const codeBlockRegex = /```(?:bash|shell)?\s*([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const commandBlock = match[1].trim();

      // Split by lines and process each line as a command
      const commandLines = commandBlock.split('\n');

      for (const line of commandLines) {
        if (line.trim() && !line.startsWith('#')) {
          commands.push({
            command: line.trim(),
            output: generateMockOutput(line.trim()),
            timestamp: new Date()
          });
        }
      }
    }

    return { commands };
  };

  // Generate mock output for terminal commands
  const generateMockOutput = (command: string): string => {
    if (command.startsWith('ls') || command.startsWith('dir')) {
      return 'index.html\nmain.py\nREADME.md\nscript.js\nstyles.css';
    } else if (command.startsWith('mkdir')) {
      return `Directory created: ${command.split(' ')[1]}`;
    } else if (command.startsWith('python') || command.startsWith('python3')) {
      return 'Hello, world!';
    } else if (command.startsWith('npm') || command.startsWith('yarn')) {
      return 'Installing packages...\nDone in 2.3s';
    } else if (command.startsWith('git')) {
      return 'Changes committed successfully';
    } else {
      return 'Command executed successfully';
    }
  };

  // Extract terminal commands from raw log
  const extractTerminalCommandsFromRawLog = (rawLog: string): TerminalCommand[] => {
    const commands: TerminalCommand[] = [];
    const lines = rawLog.split('\n');

    let inCommandBlock = false;
    let currentCommand = '';
    let currentOutput = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for terminal command patterns
      if (line.startsWith('$') && line.length > 1) {
        // If we were processing a previous command, save that
        if (currentCommand) {
          commands.push({
            command: currentCommand,
            output: currentOutput.trim(),
            timestamp: new Date()
          });
        }

        // Start new command
        currentCommand = line.substring(1).trim();
        currentOutput = '';
        inCommandBlock = true;
      } else if (inCommandBlock && line && !line.startsWith('$')) {
        // Add to current output
        currentOutput += line + '\n';
      } else if (inCommandBlock && line === '') {
        // Empty line might indicate end of output block
        inCommandBlock = false;
      }
    }

    // Add the last command if any
    if (currentCommand) {
      commands.push({
        command: currentCommand,
        output: currentOutput.trim(),
        timestamp: new Date()
      });
    }

    return commands;
  };

  // Function to generate a truly unique ID
  const generateUniqueId = () => {
    return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Handle initial prompt submission from landing page
  const handleInitialPrompt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // If user is logged in, go to workspace with the query
    if (isLoggedIn) {
      // Add user message
      const userMessage: Message = {
        id: generateUniqueId(),
        content: input,
        role: 'user',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setLandingPage(false);
      setShowWorkspace(true);

      // Process the message (reuse code from handleSubmit without clearing input yet)
      const messageToSend = input;
      setIsLoading(true);
      setWorkflowSteps([]);

      // Call Zirak API and process response (same as in handleSubmit)
      sendMessageToZirak(messageToSend)
        .then(({ response, workflow_steps, files_created, terminal_commands }) => {
          // Set workflow steps
          setWorkflowSteps(workflow_steps);
          setShowWorkflow(true);

          // Set activeTab to workflow to show steps immediately
          setActiveTab('workflow');

          // Add new files to file system if any
          if (files_created && files_created.length > 0) {
            updateFileSystem(files_created);
            // Switch to files tab after delay
            setTimeout(() => {
              setActiveTab('files');
            }, 3000);
          }

          // Add terminal commands if any
          if (terminal_commands && terminal_commands.length > 0) {
            setTerminalCommands(prev => [...prev, ...terminal_commands]);
            if (terminal_commands.length > 2) {
              setTimeout(() => {
                setActiveTab('terminal');
              }, 3000);
            }
          }

          // Add assistant response
          const assistantMessage: Message = {
            id: generateUniqueId(),
            content: response,
            role: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
          setInput('');
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error communicating with Zirak:", error);

          // Add error message
          const errorMessage: Message = {
            id: generateUniqueId(),
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            role: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, errorMessage]);
          setInput('');
          setIsLoading(false);
        });
    } else {
      // If user is not logged in, go to login screen
      setLandingPage(false);
      setShowLogin(true);
      // Keep the input for after login
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // Check if user is logged in
    if (!isLoggedIn) {
      // Display login form instead of processing the request
      setShowLogin(true);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: generateUniqueId(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    // Clear input and store message for sending
    const messageToSend = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setWorkflowSteps([]);

    try {
      // Show workspace view after first user message
      if (!showWorkspace) {
        setShowWorkspace(true);
      }

      // Clear previous workflow steps and set status to start new workflow
      setWorkflowSteps([{
        timestamp: new Date().toISOString(),
        agent: "System",
        action: "Processing",
        message: `Sending request to Zirak: "${messageToSend}"`,
        status: "in_progress"
      }]);
      setShowWorkflow(true);

      // Always switch to workflow tab for a new message
      setActiveTab('workflow');

      // Get response from Zirak backend
      const { response, workflow_steps, files_created, terminal_commands } = await sendMessageToZirak(messageToSend);

      console.log("Final workflow steps:", workflow_steps);

      // Check if we have clarification questions and set the tab
      const hasClarification = workflow_steps.some(step =>
        step.agent === 'ClarificationAgent' && step.status === 'in_progress'
      );

      if (hasClarification) {
        console.log("Clarification needed - switching to workflow tab");
        setActiveTab('workflow');
      }

      // Set workflow steps
      setWorkflowSteps(workflow_steps);
      setShowWorkflow(true);

      // Add new files to file system if any
      if (files_created && files_created.length > 0) {
        updateFileSystem(files_created);
        // Switch to files tab after a short delay if no clarification needed
        if (!hasClarification) {
          setTimeout(() => {
            setActiveTab('files');
          }, 3000);
        }
      }

      // Add terminal commands if any
      if (terminal_commands && terminal_commands.length > 0) {
        setTerminalCommands(prev => [...prev, ...terminal_commands]);
        // If many commands were executed and no clarification needed, switch to terminal tab
        if (terminal_commands.length > 2 && !hasClarification) {
          setTimeout(() => {
            setActiveTab('terminal');
          }, 3000);
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: generateUniqueId(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error communicating with Zirak:", error);

      // Show workspace even on error
      if (!showWorkspace) {
        setShowWorkspace(true);
      }

      // Add error message with more details
      const errorMessage: Message = {
        id: generateUniqueId(),
        content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login form submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // In a real application, you would validate credentials against a backend
    // For demo purposes, we're just checking if fields are not empty
    if (loginEmail.trim() && loginPassword.trim()) {
      setIsLoggedIn(true);
      setShowLogin(false);

      // If there's a pending message, go straight to workspace
      if (input.trim()) {
        setShowWorkspace(true);

        // Handle the pending message
        const userMessage: Message = {
          id: generateUniqueId(),
          content: input,
          role: 'user',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        handleSubmit(e);
      } else {
        // Otherwise go to the chat view
        setShowWorkspace(false);
      }
    }
  };

  // Update file system with new files
  const updateFileSystem = (newFiles: FileSystemItem[]) => {
    setFileSystem(prev => {
      // Create a deep copy of the current file system
      const newFileSystem = JSON.parse(JSON.stringify(prev));

      // Add each new file to the root project directory
      for (const file of newFiles) {
        // Check if the file already exists
        const projectDir = newFileSystem[0];
        if (!projectDir.children.some((f: FileSystemItem) => f.path === file.path)) {
          projectDir.children.push(file);
        }
      }

      return newFileSystem;
    });
  };

  // Toggle directory expansion
  const toggleDirectory = (path: string) => {
    setFileSystem(prev => {
      const newFileSystem = JSON.parse(JSON.stringify(prev));

      // Find and toggle the directory
      const toggleDir = (items: FileSystemItem[]) => {
        for (const item of items) {
          if (item.path === path && item.type === 'directory') {
            item.expanded = !item.expanded;
            return true;
          }

          if (item.children && toggleDir(item.children)) {
            return true;
          }
        }

        return false;
      };

      toggleDir(newFileSystem);
      return newFileSystem;
    });
  };

  // Select a file to view its content
  const selectFile = (file: FileSystemItem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setActiveTab('preview');
    }
  };

  // Render message content with markdown support
  const renderMessageContent = (content: string) => {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  // Get agent icon based on name
  const getAgentIcon = (agentName: string) => {
    const name = agentName.toLowerCase();
    if (name.includes('system')) return <Circle className="h-4 w-4" />;
    if (name.includes('initiating')) return <Bot className="h-4 w-4" />;
    if (name.includes('llm')) return <Layers className="h-4 w-4" />;
    if (name.includes('query')) return <Activity className="h-4 w-4" />;
    if (name.includes('critical')) return <Activity className="h-4 w-4" />;
    if (name.includes('clarification')) return <ArrowRight className="h-4 w-4" />;
    if (name.includes('step_generator')) return <Code className="h-4 w-4" />;
    if (name.includes('userproxy')) return <User className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  };

  // Get agent color based on name
  const getAgentColor = (agentName: string) => {
    const name = agentName.toLowerCase();
    if (name.includes('system')) return 'bg-blue-100 dark:bg-blue-950/50';
    if (name.includes('initiating')) return 'bg-purple-100 dark:bg-purple-950/50';
    if (name.includes('llm')) return 'bg-green-100 dark:bg-green-950/50';
    if (name.includes('query')) return 'bg-yellow-100 dark:bg-yellow-950/50';
    if (name.includes('critical')) return 'bg-red-100 dark:bg-red-950/50';
    if (name.includes('clarification')) return 'bg-amber-100 dark:bg-amber-950/50';
    if (name.includes('step_generator')) return 'bg-cyan-100 dark:bg-cyan-950/50';
    if (name.includes('userproxy')) return 'bg-indigo-100 dark:bg-indigo-950/50';
    return 'bg-primary/10';
  };

  // Render file system tree
  const renderFileSystem = (items: FileSystemItem[], level: number = 0) => {
    return (
      <div className={level > 0 ? 'pl-4' : ''}>
        {items.map((item, index) => (
          <div key={`${item.path}-${index}`}>
            {item.type === 'directory' ? (
              <div>
                <div
                  className="flex items-center py-1 hover:bg-muted rounded cursor-pointer"
                  onClick={() => toggleDirectory(item.path)}
                >
                  {item.expanded ? (
                    <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
                  )}
                  {item.expanded ? (
                    <FolderOpen className="h-4 w-4 mr-2 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 mr-2 text-primary" />
                  )}
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.expanded && item.children && renderFileSystem(item.children, level + 1)}
              </div>
            ) : (
              <div
                className="flex items-center py-1 pl-5 hover:bg-muted rounded cursor-pointer"
                onClick={() => selectFile(item)}
              >
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{item.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Update the parseRawLog function to better handle clarification boxes
  const parseRawLog = (rawLog: string, userMessage: string): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];

    // Split the log by agent messages
    const lines = rawLog.split('\n');
    let currentAgent = "";
    let currentAction = "";
    let messageBuffer = "";
    let timestamp = new Date().toISOString();
    let clarificationMode = false;
    let clarificationContent = "";
    let questionCounter = 0;
    let inQuestionBox = false;

    // Initialize with a system step for the user's message
    steps.push({
      timestamp: new Date().toISOString(),
      agent: "System",
      action: "Received request",
      message: `Processing: "${userMessage}"`,
      status: "completed"
    });

    console.log("Parsing raw log:", rawLog);

    // Special case: Check for clarification boxes in the whole log at once
    if (rawLog.includes("Clarification Needed") || rawLog.includes("─── Clarification Needed ───")) {
      // Look for all question patterns
      const questionMatches = [...rawLog.matchAll(/Question\s+(\d+)\/(\d+)/g)];

      if (questionMatches.length > 0) {
        console.log("Found question patterns:", questionMatches.length);

        // Add a CriticalAnalysisAgent step
        steps.push({
          timestamp: new Date().toISOString(),
          agent: "CriticalAnalysisAgent",
          action: "Analysis Complete",
          message: "Determined clarification is needed",
          status: "completed"
        });

        // Add a step for the clarification agent
        steps.push({
          timestamp: new Date().toISOString(),
          agent: "ClarificationAgent",
          action: "Request clarification",
          message: "Additional information needed from user",
          content: "Clarification Needed - Please answer the following questions:",
          status: "in_progress"
        });

        // Extract and add each question
        for (const match of questionMatches) {
          const questionNum = match[1];
          const totalQuestions = match[2];

          // Find the question content - look for box patterns
          const questionIndex = match.index;
          if (questionIndex !== undefined) {
            // Look for the question box after this question header
            const boxStartIndex = rawLog.indexOf("╭", questionIndex);
            const boxEndIndex = rawLog.indexOf("╰", boxStartIndex);

            if (boxStartIndex > -1 && boxEndIndex > -1) {
              // Extract the box content
              const boxContent = rawLog.substring(boxStartIndex, boxEndIndex + 1);

              // Clean up the box content (remove box characters)
              const cleanContent = boxContent
                .split('\n')
                .map(line => {
                  // Extract content from inside the box
                  const match = line.match(/│\s*(.*?)\s*│/);
                  return match ? match[1] : line.replace(/[╭╮╰╯─│]/g, '').trim();
                })
                .filter(line => line.length > 0)
                .join('\n');

              // Add a step for this question
              steps.push({
                timestamp: new Date(Date.now() + parseInt(questionNum) * 1000).toISOString(),
                agent: "ClarificationAgent",
                action: "Question",
                message: `Question ${questionNum}/${totalQuestions}`,
                content: cleanContent,
                status: "in_progress"
              });
            }
          }
        }

        // Return the steps immediately for clarification questions
        console.log("Generated clarification steps:", steps);
        return steps;
      }
    }

    // If no clarification questions found, proceed with the normal parsing
    // Look for patterns like "AgentName (to chat_manager):" or "Next speaker: AgentName"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Parse timestamp if it looks like a timestamp (e.g., 2025-03-17 19:51:36,056)
      if (line.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)) {
        timestamp = new Date(line.split(' - ')[0]).toISOString();
        continue;
      }

      // Check for agent speaking pattern
      const agentPattern = /^(\w+)\s+\(to\s+chat_manager\):/;
      const agentMatch = line.match(agentPattern);
      if (agentMatch) {
        // If we were processing a previous agent, save that step
        if (currentAgent && messageBuffer) {
          steps.push({
            timestamp,
            agent: currentAgent,
            action: currentAction || "Processing",
            message: messageBuffer.trim(),
            status: "completed"
          });
        }

        // Start new agent
        currentAgent = agentMatch[1];
        currentAction = "Speaking";
        messageBuffer = "";
        continue;
      }

      // Check for state transition
      if (line.includes("State transition from:")) {
        const parts = line.split("State transition from:");
        if (parts.length > 1) {
          const agentName = parts[1].trim();
          steps.push({
            timestamp,
            agent: agentName,
            action: "State transition",
            message: `Completed task and transitioning`,
            status: "completed"
          });
        }
        continue;
      }

      // Check for next speaker
      const speakerMatch = line.match(/Next speaker: (\w+)/);
      if (speakerMatch) {
        const nextAgent = speakerMatch[1];
        steps.push({
          timestamp,
          agent: nextAgent,
          action: "Activated",
          message: `Starting work`,
          status: "in_progress"
        });
        continue;
      }

      // Check for "requires_clarification: True" pattern which indicates a clarification is needed
      if (line.includes("requires_clarification: True")) {
        steps.push({
          timestamp,
          agent: "CriticalAnalysisAgent",
          action: "Analysis Complete",
          message: "Determined clarification is needed",
          status: "completed"
        });
        continue;
      }

      // Add line to current message buffer if we have an agent
      if (currentAgent) {
        messageBuffer += line + "\n";
      }
    }

    // Add the last agent's message if any
    if (currentAgent && messageBuffer && !clarificationMode) {
      steps.push({
        timestamp,
        agent: currentAgent,
        action: currentAction || "Processing",
        message: messageBuffer.trim(),
        status: "completed"
      });
    }

    console.log("Parsed workflow steps:", steps);
    return steps;
  };

  return (
    <>
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16 flex flex-col min-h-screen">
        {landingPage ? (
          // Landing page
          <div className="flex-1 flex flex-col">
            {/* Hero section */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8">
                What do you want to <span className="text-primary">create</span> today?
            </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl">
                Zirak AI helps you build anything you can imagine, from code and design to complex problem-solving. Just ask.
              </p>

              <div className="w-full max-w-xl mb-8">
                <form onSubmit={handleInitialPrompt} className="flex space-x-2">
                  <Input
                    placeholder="Tell me what you'd like to build..."
                    className="flex-1 h-12 text-lg"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button type="submit" size="lg" className="h-12 px-6">
                    <SendIcon className="h-5 w-5 mr-2" />
                    Begin
                </Button>
                </form>
              </div>

              <div className="flex flex-wrap gap-4 justify-center items-center">
                <div className="text-sm text-muted-foreground">Try:</div>
                <Button variant="outline" size="sm" onClick={() => setInput("Create a basic todo app with React")}>
                  Create a todo app
                </Button>
                <Button variant="outline" size="sm" onClick={() => setInput("Help me design a database for an e-commerce site")}>
                  Design a database
                </Button>
                <Button variant="outline" size="sm" onClick={() => setInput("Generate an API for user authentication")}>
                  Build an API
                </Button>
            </div>
          </div>

            {/* Features section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-20 border-t">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Code className="h-7 w-7 text-primary" />
        </div>
                <h3 className="text-xl font-semibold mb-2">Code Generation</h3>
                <p className="text-muted-foreground">
                  Turn your ideas into working code in any programming language with detailed explanations.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Terminal className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Interactive Terminal</h3>
                <p className="text-muted-foreground">
                  Execute commands and see real-time output without leaving your workspace.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Folder className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">File Management</h3>
                <p className="text-muted-foreground">
                  Create, view, and organize your project files in a structured environment.
                </p>
          </div>
        </div>

            <div className="border-t py-20">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                  Zirak's transparent workflow process gives you full visibility into how your ideas become reality.
            </p>
          </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <div className="font-bold">1</div>
                  </div>
                  <h3 className="font-medium mb-2">Ask a Question</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe what you want to build in natural language
                  </p>
                </div>

                <div className="p-6 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <div className="font-bold">2</div>
                  </div>
                  <h3 className="font-medium mb-2">Analyze & Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    AI breaks down your request into actionable steps
                  </p>
                </div>

                <div className="p-6 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <div className="font-bold">3</div>
                  </div>
                  <h3 className="font-medium mb-2">Generate Solution</h3>
                  <p className="text-sm text-muted-foreground">
                    Produces code, files, and commands to solve your problem
                  </p>
                </div>

                <div className="p-6 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <div className="font-bold">4</div>
                  </div>
                  <h3 className="font-medium mb-2">Iterate & Refine</h3>
                  <p className="text-sm text-muted-foreground">
                    Continue the conversation to enhance your solution
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : showLogin ? (
          // Login screen
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-md mx-auto">
              <Card className="shadow-xl border-0 bg-gradient-to-b from-background to-muted/30">
                <CardHeader className="pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-center text-2xl">Login to Zirak</CardTitle>
                  <p className="text-center text-muted-foreground mt-2">
                    Sign in to access the Zirak AI Assistant
                  </p>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          className="pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
          </div>
        </div>
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>

                    {/* Demo mode shortcut */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => {
                          setIsLoggedIn(true);
                          setShowLogin(false);

                          // If there's a pending message, go straight to workspace
                          if (input.trim()) {
                            setShowWorkspace(true);
                          } else {
                            // Otherwise show the chat first
                            setShowWorkspace(false);
                          }
                        }}
                      >
                        Continue in Demo Mode
                      </button>
          </div>
                  </form>
                </CardContent>

                <CardFooter className="flex justify-center border-t pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogin(false);
                      setLandingPage(true);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    ← Back to Home
                  </button>
                </CardFooter>
              </Card>
                  </div>
          </div>
        ) : !showWorkspace ? (
          // Initial centered chat view
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-md mx-auto">
              <Card className="shadow-xl border-0 bg-gradient-to-b from-background to-muted/30">
                <CardHeader className="pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-center text-2xl">Zirak AI Assistant</CardTitle>
                  <p className="text-center text-muted-foreground mt-2">
                    Ask me anything to get started with your workspace
                  </p>
                </CardHeader>

                <CardContent className="pb-6">
                  <div className="h-auto max-h-[250px] overflow-y-auto flex flex-col space-y-4 mb-4">
                    {messages.map((message) => (
                      <div key={`message-${message.id}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        <div className={`rounded-lg p-3 flex-1 max-w-[95%] ${
                          message.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary ml-auto'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {message.role === 'assistant' ? (
                              <>
                                <Bot className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Zirak</span>
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4" />
                                <span className="text-sm font-medium">You</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm">
                            {renderMessageContent(message.content)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-lg p-3 flex-1 max-w-[90%]">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Zirak</span>
                          </div>
                          <div className="flex space-x-1 items-center">
                            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                <CardFooter>
                  <form className="flex w-full gap-2" onSubmit={handleSubmit}>
                    <Input
                      id="message-input"
                      placeholder={needsClarification ? "Type your answer to the question..." : "Type your message here..."}
                      className={`flex-1 ${needsClarification ? 'border-amber-500 dark:border-amber-500' : ''}`}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className={needsClarification ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                      <SendIcon className="h-4 w-4" />
                      <span className="sr-only">Send message</span>
                  </Button>
                  </form>
                </CardFooter>
              </Card>

              <div className="flex justify-center mt-8">
                <div className="flex space-x-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <Code className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Code Assistance</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <Terminal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Terminal Access</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <Folder className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">File Management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Workspace view with chat (30%) and tabs (70%)
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-4 max-w-7xl mx-auto w-full">
            {needsClarification && (
              <div className="lg:col-span-10 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowRight className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="text-amber-800 dark:text-amber-200 font-medium">Clarification needed</span>
                  <span className="ml-2 text-amber-600 dark:text-amber-400 text-sm">Please check the workflow tab and answer the question</span>
                </div>
                  <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  onClick={() => setActiveTab('workflow')}
                >
                  View Question
                  </Button>
              </div>
            )}

            {/* Chat conversation area - 30% */}
            <Card className="lg:col-span-3 shadow-lg border-0 bg-gradient-to-b from-background to-muted/30">
              <CardHeader className="border-b bg-muted/50 p-4">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Zirak Chat
                  {isLoading && (
                    <div className="ml-auto">
                      <div className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                        Processing...
                      </div>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-4 h-[600px] overflow-y-auto flex flex-col space-y-4">
                  {messages.map((message) => (
                    <div key={`message-${message.id}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <div className={`rounded-lg p-3 flex-1 max-w-[95%] ${
                        message.role === 'assistant' ? 'bg-primary/10' : 'bg-secondary ml-auto'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'assistant' ? (
                            <>
                              <Bot className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Zirak</span>
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4" />
                              <span className="text-sm font-medium">You</span>
                            </>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-sm">
                          {renderMessageContent(message.content)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-lg p-3 flex-1 max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Zirak</span>
                        </div>
                        <div className="flex space-x-1 items-center">
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              <CardFooter className="border-t p-3">
                <form className="flex w-full gap-2" onSubmit={handleSubmit}>
                  <Input
                    id="message-input"
                    placeholder={needsClarification ? "Type your answer to the question..." : "Type your message here..."}
                    className={`flex-1 ${needsClarification ? 'border-amber-500 dark:border-amber-500' : ''}`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} className={needsClarification ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                    <SendIcon className="h-4 w-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
                </CardFooter>
              </Card>

          {/* Workspace area - 70% */}
          <Card className="lg:col-span-7 shadow-lg border-0 bg-gradient-to-b from-background to-muted/30">
            <CardHeader className="border-b bg-muted/50 p-4">
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Workspace
                {needsClarification ? (
                  <div className="ml-auto flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-xs text-amber-600 dark:text-amber-400">Waiting for clarification</span>
                  </div>
                ) : isLoading && workflowSteps.length > 0 && (
                  <div className="ml-auto flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Live Processing</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <Tabs defaultValue="files" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-muted/50">
                  <TabsTrigger value="files" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    <Folder className="h-4 w-4 mr-2" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="terminal" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    <Terminal className="h-4 w-4 mr-2" />
                    Terminal
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    <Activity className="h-4 w-4 mr-2" />
                    Workflow
                    {isLoading && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Files Tab */}
                <TabsContent value="files" className="p-0 m-0">
                  <div className="p-4 h-[600px] overflow-y-auto">
                    <div className="text-sm font-medium mb-2 flex items-center">
                      <span>File Explorer</span>
                      <div className="ml-auto flex space-x-2">
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <Folder className="h-4 w-4 mr-1" />
                          New Folder
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-2">
                          <FileText className="h-4 w-4 mr-1" />
                          New File
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-md p-2 bg-muted/10">
                      {renderFileSystem(fileSystem)}
                    </div>
                  </div>
                </TabsContent>

                {/* Terminal Tab */}
                <TabsContent value="terminal" className="p-0 m-0">
                  <div className="p-0 h-[600px] overflow-y-auto bg-black text-green-400 font-mono text-sm">
                    <div className="p-2 bg-muted-foreground/20 text-foreground text-xs border-b border-muted-foreground/10">
                      <div className="flex items-center justify-between">
                        <span>Terminal</span>
                        <span>bash</span>
                      </div>
                    </div>
                    <div className="p-4">
                      {terminalCommands.map((cmd, index) => (
                        <div key={`cmd-${index}-${cmd.timestamp.getTime()}`} className="mb-3">
                          <div className="flex items-center">
                            <span className="text-yellow-400 mr-2">$</span>
                            <span>{cmd.command}</span>
                          </div>
                          <div className="ml-4 mt-1 whitespace-pre-wrap text-muted-foreground">{cmd.output}</div>
                        </div>
                      ))}
                      <div className="flex items-center text-yellow-400">
                        <span className="mr-2">$</span>
                        <span className="animate-pulse">|</span>
          </div>
                      <div ref={terminalEndRef} />
        </div>
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="p-0 m-0">
                  <div className="p-4 h-[600px] overflow-y-auto">
                    {selectedFile ? (
                      <div>
                        <div className="flex items-center mb-4 bg-muted/30 p-2 rounded-md">
                          <FileText className="h-4 w-4 mr-2 text-primary" />
                          <span className="font-medium text-sm">{selectedFile.path}</span>
                        </div>
                        <div className="border rounded-md p-4 bg-muted/10 font-mono whitespace-pre-wrap text-sm overflow-x-auto">
                          {selectedFile.content || 'No content available'}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Eye className="h-12 w-12 mb-4 text-muted" />
                        <p className="text-lg font-medium mb-1">No file selected</p>
                        <p className="text-sm max-w-md">
                          Select a file from the Files tab to preview its content.
                        </p>
        </div>
                    )}
                  </div>
                </TabsContent>

                {/* Workflow Tab */}
                <TabsContent value="workflow" className="p-0 m-0">
                  <div className="p-4 h-[600px] overflow-y-auto">
                    {workflowSteps.length > 0 ? (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted-foreground/20"></div>
                        <div className="space-y-3">
                          {workflowSteps.map((step, index) => (
                            <div key={`step-${index}-${step.timestamp}`} className="relative ml-6 pb-3">
                              <div className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center
                                ${step.status === 'completed' ? getAgentColor(step.agent) : 'bg-primary/10'}`}>
                                {step.status === 'completed' ? (
                                  getAgentIcon(step.agent)
                                ) : (
                                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                                )}
                              </div>
                              <div className={`mb-1 flex items-center ${getAgentColor(step.agent)} bg-opacity-50 p-2 rounded-md`}>
                                <span className="text-sm font-semibold">{step.agent}</span>
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-black/10 rounded">
                                  {step.action}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {new Date(step.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-medium ml-2">
                                {step.message}
                              </div>
                              {step.content && (
                                <div className={`text-xs mt-1 text-foreground ml-2 p-2 rounded-md overflow-auto max-h-60
                                  ${step.agent === 'ClarificationAgent' ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-muted/5'}`}>
                                  <pre className="whitespace-pre-wrap">{step.content}</pre>
                                  {step.agent === 'ClarificationAgent' && (
                                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 flex items-center">
                                      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Waiting for your response...</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {isLoading && (
                            <div className="relative ml-6 pb-3">
                              <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                <Activity className="h-4 w-4 text-primary" />
                              </div>
                              <div className="mb-1 flex items-center bg-muted/10 p-2 rounded-md">
                                <span className="text-sm font-semibold">Processing</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {new Date().toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-medium ml-2">
                                Waiting for next agent to respond...
                              </div>
                            </div>
                          )}
                          <div ref={workflowEndRef} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <Activity className="h-12 w-12 mb-4 text-muted" />
                        <p className="text-lg font-medium mb-1">No workflow data</p>
                        <p className="text-sm max-w-md">
                          Start a conversation to see the Zirak workflow steps.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-4">
          Powered by Zirak - Your AI Assistant
        </p>
      </main>

      <footer className="py-6 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="font-bold text-xl">Zirak Chatbot</div>
              <p className="text-muted-foreground mt-1">© 2024 Zirak. All rights reserved.</p>
            </div>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setLandingPage(true);
                  setShowWorkspace(false);
                  setShowLogin(false);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
