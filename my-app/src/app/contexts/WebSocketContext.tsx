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
  inputPrompt: string;
  waitingForUserInput: boolean;
  sendMessage: (message: string) => void;
  sendUserInputResponse: (response: string) => void;
  updateFileSystem: (fileSystem: FileSystem[]) => void;
  addTerminalCommand: (command: string, output: string) => void;
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
  inputPrompt: '',
  waitingForUserInput: false,
  sendMessage: () => {},
  sendUserInputResponse: () => {},
  updateFileSystem: () => {},
  addTerminalCommand: () => {},
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
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [waitingForUserInput, setWaitingForUserInput] = useState<boolean>(false);

  // Initialize socket connection
  useEffect(() => {
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

    socketInstance.on('workflow_completed', (data: { workflow_id: string; result: string }) => {
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

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Function to send a message to the server
  const sendMessage = (message: string) => {
    if (socket && connected) {
      // Add message to local state immediately
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, newMessage]);
      
      // Send to server
      socket.emit('message', {
        message,
        workflow_id: activeWorkflowId || undefined,
      });
    }
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
  const addTerminalCommand = (command: string, output: string) => {
    setTerminal((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        command,
        output,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

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
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 