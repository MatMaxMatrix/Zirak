'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
  refreshConnection: () => void;
  backendMissing: boolean;
  connectionAttempted: boolean;
  savingFromEditor: boolean;
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
  refreshConnection: () => {},
  backendMissing: false,
  connectionAttempted: false,
  savingFromEditor: false,
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
  const [backendMissing, setBackendMissing] = useState<boolean>(false);
  const [connectionAttempted, setConnectionAttempted] = useState<boolean>(false);
  const [savingFromEditor, setSavingFromEditor] = useState<boolean>(false);

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
    setConnectionAttempted(true);
    
    // Get the backend URL from environment variables or generate based on current URL
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!backendUrl) {
      // Fallback to a URL derived from the current domain
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      const hostname = window.location.hostname;
      
      // If running on localhost, use the default port
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        backendUrl = 'http://localhost:5001';
      } else {
        // For production, try to use the same domain with a different port or path
        backendUrl = `${protocol}://${hostname}:5001`;
      }
    }
    
    console.log('Connecting to backend at:', backendUrl);

    // Quick check if backend is available before attempting socket connection
    try {
      // Create an AbortController with timeout for browsers that don't support AbortSignal.timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      fetch(`${backendUrl}/health`, { 
        mode: 'no-cors', 
        signal: controller.signal 
      })
        .then(() => {
          clearTimeout(timeoutId);
          // Proceed with socket initialization if backend is available
          setupSocket(backendUrl);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          console.error('Backend server appears to be unavailable');
          setBackendMissing(true);
          
          // Add a system message about missing backend
          setMessages([{
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Backend server is not running. Please start the backend server and refresh the page.',
            timestamp: new Date().toISOString()
          }]);
        });
    } catch (error) {
      console.error('Error checking backend availability:', error);
      // Try to initialize socket anyway in case the error is with the fetch API
      setupSocket(backendUrl);
    }
    
    // Setup the socket connection
    function setupSocket(url: string) {
      // Test for browser WebSocket support and set appropriate default transport
      const defaultTransports = 'WebSocket' in window ? ['websocket', 'polling'] : ['polling'];
      
      // Configure Socket.IO with additional options for better transport handling
      const socketInstance = io(url, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: defaultTransports,
        upgrade: true, // Allow transport upgrade (e.g., from polling to WebSocket)
        rememberUpgrade: true,
        extraHeaders: {
          'Cache-Control': 'no-cache'
        },
        forceNew: true,
        autoConnect: true,
        withCredentials: true, // Include credentials in cross-origin requests
        path: '/socket.io/', // Default Socket.IO path
        rejectUnauthorized: process.env.NODE_ENV === 'production' // Allow self-signed certs in dev
      });

      // Add a manual WebSocket transport error recovery mechanism
      let transportErrorCount = 0;
      const MAX_TRANSPORT_ERRORS = 3;
      let hasConnectedBefore = false;

      // Track connection start time to measure connection speed
      const connectionStartTime = Date.now();

      // Watch for transport changes - using any because Socket.IO types don't expose this event correctly
      // @ts-ignore - Socket.IO internal event
      socketInstance.io.on("transport", (transport: any) => {
        const connectionTime = Date.now() - connectionStartTime;
        console.log(`Using transport: ${transport.name} (established in ${connectionTime}ms)`);
        
        // Add listeners specific to current transport
        if (transport.name === 'websocket') {
          const ws = transport.transport.ws;
          if (ws) {
            // Monitor the underlying WebSocket
            const originalOnError = ws.onerror;
            ws.onerror = function(error: Event) {
              console.error('Raw WebSocket error:', error);
              
              // Track WebSocket errors and force transport switch after repeated failures
              transportErrorCount++;
              
              if (transportErrorCount >= MAX_TRANSPORT_ERRORS && hasConnectedBefore) {
                console.log('Multiple WebSocket errors, switching to polling transport');
                // @ts-ignore - Force transport to polling
                socketInstance.io.opts.transports = ['polling'];
                
                // Only try to reconnect if not already reconnecting
                // @ts-ignore - Access internal socket.io property
                if (!socketInstance.io._reconnecting) {
                  socketInstance.disconnect().connect();
                }
              }
              
              if (originalOnError) originalOnError.call(ws, error);
            };
          }
        }
      });
      
      // Log engine.io errors
      // @ts-ignore - Engine.io internal event
      socketInstance.io.engine.on("error", (err: Error) => {
        console.error("Engine.io error:", err);
        
        // If this is a WebSocket error, try to force polling
        // @ts-ignore - Access internal socket.io property
        if (socketInstance.io?.engine?.transport?.name === 'websocket') {
          console.log('Engine.io error on WebSocket transport, switching to polling');
          // @ts-ignore - Force transport to polling
          socketInstance.io.opts.transports = ['polling'];
          
          // Only try to reconnect if not already reconnecting
          // @ts-ignore - Access internal socket.io property
          if (!socketInstance.io._reconnecting) {
            socketInstance.disconnect().connect();
          }
        }
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket server');
        // @ts-ignore - Socket.IO internal property
        console.log('Transport used:', socketInstance.io.engine.transport.name);
        setConnected(true);
        hasConnectedBefore = true;
        transportErrorCount = 0; // Reset error count on successful connection
      });

      socketInstance.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnected(false);
        
        // Mark backend as missing after connection error
        setBackendMissing(true);
        
        // Add a system message for the user
        setMessages(prev => [
          ...prev, 
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Cannot connect to backend server. Please make sure the server is running and refresh the page.',
            timestamp: new Date().toISOString()
          }
        ]);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        
        // Add a system message for the user
        setMessages(prev => [
          ...prev, 
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'An error occurred with the connection. The system will attempt to reconnect automatically.',
            timestamp: new Date().toISOString()
          }
        ]);
      });

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Attempting to reconnect (${attemptNumber})...`);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        setConnected(true);
        
        // Add a system message to inform the user
        setMessages(prev => [
          ...prev, 
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Reconnected to server.',
            timestamp: new Date().toISOString()
          }
        ]);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('Failed to reconnect after multiple attempts');
        
        // Add a system message for the user
        setMessages(prev => [
          ...prev, 
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Failed to reconnect to the server after multiple attempts. Please refresh the page to try again.',
            timestamp: new Date().toISOString()
          }
        ]);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason);
        setConnected(false);
        
        // Attempt to reconnect if it's not an intentional disconnect
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, reconnect manually
          socketInstance.connect();
        }
        
        // Add a system message only for unexpected disconnects
        if (reason !== 'io client disconnect') {
          setMessages(prev => [
            ...prev, 
            {
              id: crypto.randomUUID(),
              role: 'system',
              content: 'Disconnected from server. Attempting to reconnect...',
              timestamp: new Date().toISOString()
            }
          ]);
        }
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
    }
  };
  
  // Function to refresh the connection - using useCallback to avoid dependency issues
  const refreshConnection = useCallback(() => {
    // If backend is missing, show a message instead of retrying
    if (backendMissing) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Backend server appears to be offline. Please start the server and refresh the page.',
          timestamp: new Date().toISOString()
        }
      ]);
      return;
    }
    
    if (socket) {
      console.log('Manually refreshing connection...');
      
      // First try to disconnect if connected
      try {
        socket.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      
      // Short timeout to ensure disconnect completes
      setTimeout(() => {
        try {
          // Force polling transport instead of WebSocket when manually reconnecting
          // @ts-ignore - access internal socket.io property
          if (socket.io && socket.io.opts) {
            console.log('Setting transport to polling for reconnection attempt');
            // @ts-ignore - force polling transport
            socket.io.opts.transports = ['polling', 'websocket'];
          }
          
          socket.connect();
          
          // Add a message informing the user
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'system',
              content: 'Attempting to reconnect to server...',
              timestamp: new Date().toISOString()
            }
          ]);
          
          // After reconnection attempt, try to restore websocket as primary transport after delay
          setTimeout(() => {
            if (socket.connected) {
              console.log('Reconnection successful, restoring normal transport order');
              // @ts-ignore - reset transport options to default
              if (socket.io && socket.io.opts) {
                // @ts-ignore - reset transport options
                socket.io.opts.transports = ['websocket', 'polling'];
              }
            }
          }, 3000);
        } catch (error) {
          console.error('Error reconnecting socket:', error);
          
          // If reconnection fails, reinitialize the socket with polling only
          setSocketInitialized(false);
          
          // Delay the initialization to prevent immediate reconnection errors
          setTimeout(() => {
            // Create a fresh socket with polling transport first
            initializeSocket();
          }, 1000);
        }
      }, 1000); // Increased delay to 1000ms for more reliable disconnection
    } else {
      // If there's no socket, reinitialize after a delay
      setSocketInitialized(false);
      setTimeout(() => {
        initializeSocket();
      }, 1000);
    }
  }, [socket, setMessages, setSocketInitialized, initializeSocket, backendMissing]);

  // Set up navigator event listeners for network status changes
  useEffect(() => {
    const handleNetworkChange = () => {
      console.log('Network status changed:', navigator.onLine ? 'online' : 'offline');
      
      if (navigator.onLine) {
        // We're back online, attempt to reconnect the socket if it's disconnected
        if (socket && !socket.connected) {
          console.log('Reconnecting after network came back online');
          refreshConnection();
        }
      } else {
        // We're offline, set the connection status accordingly
        setConnected(false);
        
        // Notify user
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: 'Your device appears to be offline. Reconnection will be attempted when network connectivity is restored.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    };
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking connection');
        // When page becomes visible again, check connection and reconnect if needed
        if (socket && !socket.connected && navigator.onLine) {
          console.log('Reconnecting after page became visible');
          refreshConnection();
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, refreshConnection]);

  // Send message function - initialize socket if not already done
  const sendMessage = (message: string) => {
    if (!socketInitialized) {
      initializeSocket();
    }
    
    if (!socket || !socket.connected) {
      console.warn('Socket not connected, attempting to reconnect...');
      
      // Add a system message to inform the user
      setMessages(prev => [
        ...prev, 
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Connection to server is not established. Trying to reconnect...',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Force a reconnection attempt
      if (socket) {
        socket.connect();
        
        // Try to send the message again after a short delay
        setTimeout(() => {
          if (socket.connected) {
            sendMessage(message);
          } else {
            setMessages(prev => [
              ...prev, 
              {
                id: crypto.randomUUID(),
                role: 'system',
                content: 'Unable to send message. Please check your connection and try again.',
                timestamp: new Date().toISOString()
              }
            ]);
          }
        }, 2000);
      } else {
        // Initialize socket and try again
        initializeSocket();
        setTimeout(() => sendMessage(message), 1000);
      }
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
    try {
      socket.emit('message', {
        message,
        workflow_id: activeWorkflowId,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add a system message about the error
      setMessages(prev => [
        ...prev, 
        {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Failed to send message. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
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
        setWorkingDirectory,
        refreshConnection,
        backendMissing,
        connectionAttempted,
        savingFromEditor
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 