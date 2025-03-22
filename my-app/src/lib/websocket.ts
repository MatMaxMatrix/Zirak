import { io, Socket } from 'socket.io-client';
import { WorkflowStep } from '@/types/workflow';

// Socket.io events
export const EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  MESSAGE_RECEIVED: 'message_received',
  WORKFLOW_UPDATE: 'workflow_update',
  AGENT_MESSAGE: 'agent_message',
  REQUEST_INPUT: 'request_input',
  PROVIDE_INPUT: 'provide_input',
  INPUT_RECEIVED: 'input_received',
  WORKFLOW_COMPLETE: 'workflow_complete',
  WORKFLOW_ERROR: 'workflow_error',
};

// WebSocket service interface
export interface WebSocketService {
  connect(): Promise<string>;
  disconnect(): void;
  sendMessage(message: string, workflowId?: string): void;
  provideInput(input: string, workflowId: string): void;
  onConnect(callback: (sid: string) => void): void;
  onDisconnect(callback: () => void): void;
  onWorkflowUpdate(callback: (data: WorkflowUpdateData) => void): void;
  onAgentMessage(callback: (data: AgentMessageData) => void): void;
  onRequestInput(callback: (data: RequestInputData) => void): void;
  onWorkflowComplete(callback: (data: WorkflowCompleteData) => void): void;
  onWorkflowError(callback: (data: WorkflowErrorData) => void): void;
}

// Event data interfaces
export interface WorkflowUpdateData {
  workflow_id: string;
  agent: string;
  message: string;
  timestamp: string;
  status?: 'in_progress' | 'completed';
}

export interface AgentMessageData {
  workflow_id: string;
  agent: string;
  message: string;
  timestamp: string;
}

export interface RequestInputData {
  workflow_id: string;
  prompt: string;
  timestamp: string;
}

export interface WorkflowCompleteData {
  workflow_id: string;
  success: boolean;
  message: string;
  status: string;
}

export interface WorkflowErrorData {
  workflow_id: string;
  error: string;
}

// Default WebSocket service implementation
class DefaultWebSocketService implements WebSocketService {
  private socket: Socket | null = null;
  private url: string;
  
  constructor(url: string = 'http://localhost:5001') {
    this.url = url;
  }
  
  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize socket connection
        this.socket = io(this.url, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        
        // Handle successful connection
        this.socket.on(EVENTS.CONNECT, () => {
          console.log('WebSocket connected');
          resolve(this.socket?.id || '');
        });
        
        // Handle connection error
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }
  
  sendMessage(message: string, workflowId?: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.emit(EVENTS.MESSAGE, {
      message,
      workflow_id: workflowId,
    });
    
    console.log(`Message sent: ${message}`);
  }
  
  provideInput(input: string, workflowId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.emit(EVENTS.PROVIDE_INPUT, {
      input,
      workflow_id: workflowId,
    });
    
    console.log(`Input provided for workflow ${workflowId}: ${input}`);
  }
  
  onConnect(callback: (sid: string) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on('connected', (data: { sid: string }) => {
      callback(data.sid);
    });
  }
  
  onDisconnect(callback: () => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.DISCONNECT, callback);
  }
  
  onWorkflowUpdate(callback: (data: WorkflowUpdateData) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.WORKFLOW_UPDATE, callback);
  }
  
  onAgentMessage(callback: (data: AgentMessageData) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.AGENT_MESSAGE, callback);
  }
  
  onRequestInput(callback: (data: RequestInputData) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.REQUEST_INPUT, callback);
  }
  
  onWorkflowComplete(callback: (data: WorkflowCompleteData) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.WORKFLOW_COMPLETE, callback);
  }
  
  onWorkflowError(callback: (data: WorkflowErrorData) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.socket.on(EVENTS.WORKFLOW_ERROR, callback);
  }
}

// Create and export the service instance
export const webSocketService = new DefaultWebSocketService();
export default webSocketService; 