import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import webSocketService, { 
  WorkflowUpdateData, 
  AgentMessageData, 
  RequestInputData,
  WorkflowCompleteData,
  WorkflowErrorData
} from './websocket';
import { 
  Message, 
  WorkflowStep, 
  WorkflowContext, 
  ActiveWorkflow 
} from '@/types/workflow';

// Context interface
interface WebSocketContextValue {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  activeWorkflow: ActiveWorkflow | null;
  messages: Message[];
  sendMessage: (content: string) => void;
  provideInput: (input: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  connecting: false,
  error: null,
  activeWorkflow: null,
  messages: [],
  sendMessage: () => {},
  provideInput: () => {},
  connect: async () => {},
  disconnect: () => {},
});

// Hook to use the context
export const useWebSocket = () => useContext(WebSocketContext);

// Provider props interface
interface WebSocketProviderProps {
  children: ReactNode;
}

// Provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<ActiveWorkflow | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-message',
      content: "Hello! I'm Zirak, your AI assistant. How can I help you today?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);

  // Connect to WebSocket
  const connect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      await webSocketService.connect();
      setConnected(true);
      
      console.log('Connected to WebSocket server');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
      console.error('WebSocket connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect from WebSocket
  const disconnect = () => {
    webSocketService.disconnect();
    setConnected(false);
  };

  // Send a message to the server
  const sendMessage = (content: string) => {
    if (!connected) {
      setError('Not connected to server');
      return;
    }

    const workflowId = activeWorkflow?.id;
    const messageId = uuidv4();
    
    // Add user message to local state
    const newMessage: Message = {
      id: messageId,
      content,
      role: 'user',
      timestamp: new Date(),
      workflowId
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // Reset any active workflow if creating a new one
    if (!workflowId) {
      const newWorkflowId = uuidv4();
      
      // Create a new workflow context
      const newWorkflow: ActiveWorkflow = {
        id: newWorkflowId,
        userInputRequired: false,
        context: {
          id: newWorkflowId,
          status: 'starting',
          steps: [],
          messages: [newMessage]
        }
      };
      
      setActiveWorkflow(newWorkflow);
      
      // Send message to server with new workflow ID
      webSocketService.sendMessage(content, newWorkflowId);
    } else {
      // Send message as part of existing workflow
      webSocketService.sendMessage(content, workflowId);
      
      // Update active workflow with this message
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow) return null;
        
        return {
          ...prevWorkflow,
          userInputRequired: false,
          userInputPrompt: undefined,
          context: {
            ...prevWorkflow.context,
            status: 'running',
            messages: [...prevWorkflow.context.messages, newMessage]
          }
        };
      });
    }
  };

  // Provide input when requested by the server
  const provideInput = (input: string) => {
    if (!connected || !activeWorkflow) {
      setError('Not connected or no active workflow');
      return;
    }

    const messageId = uuidv4();
    
    // Add user input as a message
    const newMessage: Message = {
      id: messageId,
      content: input,
      role: 'user',
      timestamp: new Date(),
      workflowId: activeWorkflow.id
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // Send the input to the server
    webSocketService.provideInput(input, activeWorkflow.id);
    
    // Update active workflow status
    setActiveWorkflow(prevWorkflow => {
      if (!prevWorkflow) return null;
      
      return {
        ...prevWorkflow,
        userInputRequired: false,
        userInputPrompt: undefined,
        context: {
          ...prevWorkflow.context,
          status: 'running',
          messages: [...prevWorkflow.context.messages, newMessage]
        }
      };
    });
  };

  // Set up event listeners
  useEffect(() => {
    // Connect handler
    const handleConnect = (sid: string) => {
      console.log(`WebSocket connected with session ID: ${sid}`);
    };
    
    // Disconnect handler
    const handleDisconnect = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };
    
    // Workflow update handler
    const handleWorkflowUpdate = (data: WorkflowUpdateData) => {
      console.log('Workflow update:', data);
      
      // Create a new workflow step
      const newStep: WorkflowStep = {
        timestamp: data.timestamp,
        agent: data.agent,
        action: 'update',
        message: data.message,
        status: data.status || 'in_progress'
      };
      
      // Update active workflow with this step
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow || prevWorkflow.id !== data.workflow_id) {
          // Create a new workflow if needed
          return {
            id: data.workflow_id,
            userInputRequired: false,
            context: {
              id: data.workflow_id,
              status: 'running',
              steps: [newStep],
              messages: []
            }
          };
        }
        
        // Update existing workflow
        return {
          ...prevWorkflow,
          context: {
            ...prevWorkflow.context,
            status: 'running',
            steps: [...prevWorkflow.context.steps, newStep],
            currentAgent: data.agent
          }
        };
      });
    };
    
    // Agent message handler
    const handleAgentMessage = (data: AgentMessageData) => {
      console.log('Agent message:', data);
      
      // Create a new message
      const newMessage: Message = {
        id: uuidv4(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date(data.timestamp),
        agent: data.agent,
        workflowId: data.workflow_id
      };
      
      // Add message to the list
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Update active workflow
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow || prevWorkflow.id !== data.workflow_id) {
          return {
            id: data.workflow_id,
            userInputRequired: false,
            context: {
              id: data.workflow_id,
              status: 'running',
              steps: [],
              messages: [newMessage],
              currentAgent: data.agent
            }
          };
        }
        
        return {
          ...prevWorkflow,
          context: {
            ...prevWorkflow.context,
            messages: [...prevWorkflow.context.messages, newMessage],
            currentAgent: data.agent
          }
        };
      });
    };
    
    // Request input handler
    const handleRequestInput = (data: RequestInputData) => {
      console.log('Input requested:', data);
      
      // Update active workflow to require user input
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow || prevWorkflow.id !== data.workflow_id) {
          return {
            id: data.workflow_id,
            userInputRequired: true,
            userInputPrompt: data.prompt,
            context: {
              id: data.workflow_id,
              status: 'waiting_for_input',
              steps: [],
              messages: []
            }
          };
        }
        
        return {
          ...prevWorkflow,
          userInputRequired: true,
          userInputPrompt: data.prompt,
          context: {
            ...prevWorkflow.context,
            status: 'waiting_for_input'
          }
        };
      });
      
      // Add a system message indicating input is needed
      const promptMessage: Message = {
        id: uuidv4(),
        content: data.prompt,
        role: 'assistant',
        timestamp: new Date(data.timestamp),
        agent: 'UserProxyAgent',
        workflowId: data.workflow_id,
        needsUserInput: true,
        userInputPrompt: data.prompt
      };
      
      setMessages(prevMessages => [...prevMessages, promptMessage]);
    };
    
    // Workflow complete handler
    const handleWorkflowComplete = (data: WorkflowCompleteData) => {
      console.log('Workflow complete:', data);
      
      // Update active workflow status
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow || prevWorkflow.id !== data.workflow_id) return null;
        
        return {
          ...prevWorkflow,
          context: {
            ...prevWorkflow.context,
            status: data.status === 'completed' ? 'completed' : 'failed'
          }
        };
      });
      
      // Add a final message if the workflow has a completion message
      if (data.message) {
        const completionMessage: Message = {
          id: uuidv4(),
          content: data.message,
          role: 'assistant',
          timestamp: new Date(),
          agent: 'System',
          workflowId: data.workflow_id
        };
        
        setMessages(prevMessages => [...prevMessages, completionMessage]);
      }
    };
    
    // Workflow error handler
    const handleWorkflowError = (data: WorkflowErrorData) => {
      console.error('Workflow error:', data);
      
      // Update active workflow with error
      setActiveWorkflow(prevWorkflow => {
        if (!prevWorkflow || prevWorkflow.id !== data.workflow_id) return null;
        
        return {
          ...prevWorkflow,
          context: {
            ...prevWorkflow.context,
            status: 'error',
            error: data.error
          }
        };
      });
      
      // Add an error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Error: ${data.error}`,
        role: 'assistant',
        timestamp: new Date(),
        agent: 'System',
        workflowId: data.workflow_id
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    };
    
    // Register event handlers
    if (connected) {
      webSocketService.onConnect(handleConnect);
      webSocketService.onDisconnect(handleDisconnect);
      webSocketService.onWorkflowUpdate(handleWorkflowUpdate);
      webSocketService.onAgentMessage(handleAgentMessage);
      webSocketService.onRequestInput(handleRequestInput);
      webSocketService.onWorkflowComplete(handleWorkflowComplete);
      webSocketService.onWorkflowError(handleWorkflowError);
    }
    
    // Cleanup event handlers on unmount
    return () => {
      if (connected) {
        disconnect();
      }
    };
  }, [connected]);

  // Connect on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Create context value
  const contextValue: WebSocketContextValue = {
    connected,
    connecting,
    error,
    activeWorkflow,
    messages,
    sendMessage,
    provideInput,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 