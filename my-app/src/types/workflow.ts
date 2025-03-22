// Define workflow step type
export type WorkflowStep = {
  timestamp: string;
  agent: string;
  action: string;
  message: string;
  status: 'in_progress' | 'completed';
  speaker?: string;
  next_speaker?: string;
  content?: string;
};

// Define message type
export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agent?: string;
  workflowId?: string;
  needsUserInput?: boolean;
  userInputPrompt?: string;
};

// Define file system item type
export type FileSystemItem = {
  name: string;
  type: 'file' | 'directory';
  path: string;
  content?: string;
  children?: FileSystemItem[];
  expanded?: boolean;
};

// Define terminal command type
export type TerminalCommand = {
  command: string;
  output: string;
  timestamp: Date;
};

// Define workflow context type
export type WorkflowContext = {
  id: string;
  status: 'starting' | 'running' | 'waiting_for_input' | 'completed' | 'error' | 'failed';
  steps: WorkflowStep[];
  messages: Message[];
  files?: FileSystemItem[];
  commands?: TerminalCommand[];
  currentAgent?: string;
  error?: string;
};

// Define a type for the active workflow state
export type ActiveWorkflow = {
  id: string;
  userInputRequired: boolean;
  userInputPrompt?: string;
  context: WorkflowContext;
}; 