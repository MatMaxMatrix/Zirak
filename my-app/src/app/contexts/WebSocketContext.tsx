'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';

// Define types for our context
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface WorkflowStep {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
  status: 'complete' | 'active' | 'waiting' | 'error';
}

export interface FileSystem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystem[];
  expanded?: boolean;
  content?: string;
}

export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  error?: string;
  exitCode?: number;
}

export interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  messages: Message[];
  activeWorkflowId: string | null;
  workflowSteps: WorkflowStep[];
  fileSystem: FileSystem[];
  terminal: TerminalCommand[];
  inputRequired: boolean;
  inputPrompt: string | null;
  waitingForUserInput: boolean;
  sendMessage: (message: string) => void;
  sendUserInputResponse: (response: string) => void;
  updateFileSystem: (fileSystem: FileSystem[]) => void;
  addTerminalCommand: (command: TerminalCommand) => void;
  updateTerminalCommand: (command: TerminalCommand) => void;
  updateLastTerminalCommand: (partialCommand: Partial<TerminalCommand>) => void;
  clearTerminal: () => void;
  workingDirectory: string;
  setWorkingDirectory: (path: string) => void;
}

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  messages: [],
  activeWorkflowId: null,
  workflowSteps: [],
  fileSystem: [],
  terminal: [],
  inputRequired: false,
  inputPrompt: null,
  waitingForUserInput: false,
  sendMessage: () => {},
  sendUserInputResponse: () => {},
  updateFileSystem: () => {},
  addTerminalCommand: () => {},
  updateTerminalCommand: () => {},
  updateLastTerminalCommand: () => {},
  clearTerminal: () => {},
  workingDirectory: '/project',
  setWorkingDirectory: () => {},
});

// Custom hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [fileSystem, setFileSystem] = useState<FileSystem[]>([]);
  const [terminal, setTerminal] = useState<TerminalCommand[]>([]);
  const [inputRequired, setInputRequired] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const [waitingForUserInput, setWaitingForUserInput] = useState<boolean>(false);
  const [socketInitialized, setSocketInitialized] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [workingDirectory, setWorkingDirectory] = useState<string>('/project');

  // Handle client-side only initialization
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize socket connection lazily - this will only run when needed
  const initializeSocket = () => {
    if (socketInitialized || !mounted) return;
    
    // Ensure we're on the client side before trying to connect
    if (typeof window === 'undefined') return;
    
    setSocketInitialized(true);
    
    // @ts-ignore - ignore socket.io-client import issue in TypeScript
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    console.log('Connecting to backend at:', backendUrl);
    const socketInstance = io(backendUrl);

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    socketInstance.on('connected', (data: { status: string }) => {
      console.log('Connected event received:', data);
    });

    socketInstance.on('workflow_started', (data: { workflow_id: string; message: string }) => {
      console.log('Workflow started:', data);
      setActiveWorkflowId(data.workflow_id);
    });

    socketInstance.on('agent_message', (data: { 
      agent: string; 
      message: string; 
      timestamp?: string;
      workflow_step?: WorkflowStep 
    }) => {
      console.log('Agent message received:', data);
      
      // Add to messages
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: data.agent === 'user' ? 'user' : 'assistant',
          content: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
        },
      ]);
      
      // Update workflow steps if applicable
      if (data.workflow_step) {
        setWorkflowSteps((prev) => {
          const step = data.workflow_step;
          if (!step) return prev;
          
          const exists = prev.some((s) => s.id === step.id);
          if (exists) {
            return prev.map((s) => s.id === step.id ? step : s);
          } else {
            return [...prev, step];
          }
        });
      }
    });

    socketInstance.on('workflow_update', (data: { 
      step?: WorkflowStep; 
      fileSystem?: FileSystem[];
      terminal?: {
        command: string;
        output: string;
        timestamp?: string;
      }
    }) => {
      console.log('Workflow update received:', data);
      
      // Update workflow steps
      if (data.step) {
        setWorkflowSteps((prev) => {
          const step = data.step;
          if (!step) return prev;
          
          const exists = prev.some((s) => s.id === step.id);
          if (exists) {
            return prev.map((s) => s.id === step.id ? step : s);
          } else {
            return [...prev, step];
          }
        });
      }
      
      // Update file system if provided
      if (data.fileSystem) {
        setFileSystem(data.fileSystem);
      }
      
      // Add terminal command if provided
      if (data.terminal) {
        const terminal = data.terminal;
        setTerminal((prev) => [...prev, {
          id: crypto.randomUUID(),
          command: terminal.command,
          output: terminal.output,
          timestamp: terminal.timestamp || new Date().toISOString(),
        }]);
      }
    });

    socketInstance.on('conversation_update', (data: {
      workflow_id: string;
      message: {
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
        agent: string;
      }
    }) => {
      console.log('Conversation update received:', data);
      
      // Only process if this update is for the active workflow
      if (activeWorkflowId === null || data.workflow_id === activeWorkflowId) {
        const messageData = data.message;
        
        // Add to messages array
        setMessages((prev) => {
          // Check if message already exists by ID to prevent duplicates
          const messageExists = prev.some((m) => m.id === messageData.id);
          if (messageExists) return prev;
          
          return [...prev, messageData];
        });
        
        // Also add as workflow step if it's not a user message
        if (messageData.role !== 'user') {
          setWorkflowSteps((prev) => {
            const newStep = {
              id: messageData.id,
              agent: messageData.agent,
              message: messageData.content,
              timestamp: messageData.timestamp,
              status: 'complete' as const,
            };
            
            return [...prev, newStep];
          });
        }
      }
    });

    socketInstance.on('user_input_required', (data: { workflow_id: string; prompt: string }) => {
      console.log('User input required:', data);
      setInputRequired(true);
      setInputPrompt(data.prompt);
      setWaitingForUserInput(true);
    });

    socketInstance.on('user_input_received', (data: { workflow_id: string; message: string }) => {
      console.log('User input received:', data);
      setInputRequired(false);
      setInputPrompt('');
      setWaitingForUserInput(false);
    });

    socketInstance.on('workflow_completed', (data: { 
      workflow_id: string; 
      result: string;
      conversation_history?: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
        agent: string;
      }>;
    }) => {
      console.log('Workflow completed:', data);
      setWaitingForUserInput(false);
      setInputRequired(false);
      
      // Add final workflow step
      setWorkflowSteps((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          agent: 'System',
          message: 'Workflow completed',
          timestamp: new Date().toISOString(),
          status: 'complete',
        },
      ]);
      
      // If conversation history is provided, synchronize our messages with it
      if (data.conversation_history && data.conversation_history.length > 0) {
        setMessages((prev) => {
          // Create a map of existing message IDs for faster lookup
          const existingIds = new Set(prev.map(msg => msg.id));
          
          // Filter out messages that already exist in our state
          const newMessages = data.conversation_history!.filter(msg => !existingIds.has(msg.id));
          
          // Add the new messages to our state
          return [...prev, ...newMessages];
        });
      }
    });

    socketInstance.on('workflow_error', (data: { workflow_id: string; error: string }) => {
      console.error('Workflow error:', data);
      setWaitingForUserInput(false);
      setInputRequired(false);
      
      // Add error workflow step
      setWorkflowSteps((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          agent: 'System',
          message: `Error: ${data.error}`,
          timestamp: new Date().toISOString(),
          status: 'error',
        },
      ]);
    });

    setSocket(socketInstance);
  };

  // Send message function - initialize socket if not already done
  const sendMessage = (message: string) => {
    if (!socketInitialized) {
      initializeSocket();
    }
    
    if (!socket || !socket.connected) {
      console.warn('Socket not connected, attempting to reconnect...');
      // Force a reconnection attempt
      if (socket) socket.connect();
      // Add message to queue to be sent when connection is established
      setTimeout(() => sendMessage(message), 500);
      return;
    }

    // Add user message to chat
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Send message to server
    socket.emit('message', {
      message,
      workflow_id: activeWorkflowId,
    });
  };

  // Function to send a response to a user input request
  const sendUserInputResponse = (response: string) => {
    if (socket && connected && activeWorkflowId && inputRequired) {
      // Add response to messages
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: response,
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      // Send to server
      socket.emit('user_input_response', {
        workflow_id: activeWorkflowId,
        response,
      });
    }
  };

  // Function to update the file system
  const updateFileSystem = (newFileSystem: FileSystem[]) => {
    setFileSystem(newFileSystem);
  };

  // Function to add a terminal command
  const addTerminalCommand = (command: TerminalCommand) => {
    setTerminal(prev => [...prev, command]);
  };

  // Update a terminal command by ID
  const updateTerminalCommand = (updatedCommand: TerminalCommand) => {
    setTerminal(prev => prev.map(cmd => 
      cmd.id === updatedCommand.id ? updatedCommand : cmd
    ));
  };
  
  // Update the last terminal command with partial data
  const updateLastTerminalCommand = (partialCommand: Partial<TerminalCommand>) => {
    setTerminal(prev => {
      if (prev.length === 0) return prev;
      
      const lastIndex = prev.length - 1;
      const updatedLast = { ...prev[lastIndex], ...partialCommand };
      
      return [
        ...prev.slice(0, lastIndex),
        updatedLast
      ];
    });
  };
  
  // Clear the terminal history
  const clearTerminal = () => {
    setTerminal([]);
  };

  // Return the provider with all the context values
  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        activeWorkflowId,
        workflowSteps,
        fileSystem,
        terminal,
        inputRequired,
        inputPrompt,
        waitingForUserInput,
        sendMessage,
        sendUserInputResponse,
        updateFileSystem,
        addTerminalCommand,
        updateTerminalCommand,
        updateLastTerminalCommand,
        clearTerminal,
        workingDirectory,
        setWorkingDirectory
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 