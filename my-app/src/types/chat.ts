import { Message, TerminalCommand } from "@/app/contexts/WebSocketContext";

export interface TabCompletionResult {
  completions: string[];
}

export interface ChatPageState {
  input: string;
  isLoading: boolean;
  showWorkflow: boolean;
  activeTab: 'workflow' | 'files' | 'editor';
  showWorkspace: boolean;
  needsClarification: boolean;
  debugVisible: boolean;
  terminalInput: string;
  terminalProcessing: boolean;
  showWelcomeMessage: boolean;
  copiedText: boolean;
  editingFile: boolean;
  fileContent: string;
  filePath: string;
  completions: string[];
  showCompletions: boolean;
  selectedCompletion: number;
  showTerminal: boolean;
  terminalHeight: number;
  isDragging: boolean;
  workspaceWidth: number;
  isHorizontalDragging: boolean;
  editorHeight: number;
  isEditorDragging: boolean;
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
}

export interface ResizeHandlerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  direction: 'horizontal' | 'vertical';
  className?: string;
}

export interface TerminalCommandExecutionResult {
  output: string;
  error?: string;
  exitCode?: number;
  newWorkingDirectory?: string;
  fileSystemChanged?: boolean;
  editable?: boolean;
  filePath?: string;
  fileContent?: string;
}

export interface TerminalProps {
  terminal: TerminalCommand[];
  showWelcomeMessage: boolean;
  input: string;
  setInput: (input: string) => void;
  isProcessing: boolean;
  workingDirectory?: string;
  completions: string[];
  showCompletions: boolean;
  selectedCompletion: number;
  onSelectCompletion: (index: number) => void;
  setShowCompletions: (show: boolean) => void;
  setSelectedCompletion: (index: number) => void;
  onSendCommand: (command: string) => Promise<void>;
  copiedText: string;
  copyTerminalContent?: () => void;
  clearTerminal?: () => void;
  refreshFileSystem?: () => Promise<void>;
  closeTerminal?: () => void;
  terminalInputRef: React.RefObject<HTMLTextAreaElement>;
  terminalEndRef: React.RefObject<HTMLDivElement>;
}

// Define OpenedFile interface
export interface OpenedFile {
  path: string;
  content: string;
  hasUnsavedChanges: boolean;
}

export interface FileEditorProps {
  filePath: string;
  fileContent: string;
  setFileContent: (content: string) => void;
  saveFileContent: () => Promise<void>;
  cancelFileEditing: () => void;
  handleEditorMouseDown?: (e: React.MouseEvent) => void;
  fileEditorRef: React.RefObject<HTMLDivElement>;
  editorHeight?: number;
  // Optional properties for multi-tab support
  openFiles?: OpenedFile[];
  activeFilePath?: string;
  onOpenFile?: (path: string, content: string) => Promise<void>;
  onCloseFile?: (path: string) => void;
  onSwitchFile?: (path: string) => void;
}

// File system item interface
export interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  expanded?: boolean;
  children?: FileSystemItem[];
  content?: string;
}

// Workflow step interface
export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  lastAccessed: string;
  config?: {
    description: string;
    type: string;
    language: string;
    framework?: string;
  };
}

export interface FileSystem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  expanded?: boolean;
  children?: FileSystem[];
  selected?: boolean;
  modified?: boolean;
  hidden?: boolean;
  icon?: string;
  meta?: {
    size?: number;
    mtime?: string;
    ctime?: string;
    permissions?: string;
  };
}

export interface WorkspaceProps {
  activeTab: 'workflow' | 'editor' | 'preview';
  setActiveTab: (tab: 'workflow' | 'editor' | 'preview') => void;
  showWorkspace: boolean;
  setShowWorkspace: (show: boolean) => void;
  width: number;
  handleHorizontalMouseDown: (e: React.MouseEvent) => void;
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
  workflowSteps: any[];
  setSelectedFile: (file: FileSystem | null) => void;
  toggleDirectory: (path: string) => void;
  terminal: any[];
  showWelcomeMessage: boolean;
  workingDirectory: string;
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  terminalHeight?: number;
  handleTerminalMouseDown?: (e: React.MouseEvent) => void;
  editingFile: boolean;
  fileContent: string;
  filePath: string;
  setFileContent: (content: string) => void;
  saveFileContent: () => void;
  cancelFileEditing: () => void;
  editorHeight?: number;
  handleEditorMouseDown?: (e: React.MouseEvent) => void;
  terminalInput: string;
  setTerminalInput: (input: string) => void;
  terminalProcessing: boolean;
  completions: any[]; 
  showCompletions: boolean;
  selectedCompletion: number;
  selectCompletion: (index: number) => void;
  setShowCompletions: (show: boolean) => void;
  setSelectedCompletion: (index: number) => void;
  executeTerminalCommand: (command: string) => Promise<void>;
  copiedText: string;
  copyTerminalContent: () => void;
  clearTerminal: () => void;
  refreshFileSystem: () => Promise<void>;
  terminalInputRef: React.RefObject<HTMLTextAreaElement>;
  terminalEndRef: React.RefObject<HTMLDivElement>;
  fileEditorRef?: React.RefObject<any>;
  workflowEndRef: React.RefObject<HTMLDivElement>;
  terminalRef?: React.RefObject<HTMLDivElement>;
  fileExplorerWidth?: number;
  handleFileExplorerResize?: (e: React.MouseEvent) => void;
  projectListWidth?: number;
  handleProjectListResize?: (e: React.MouseEvent) => void;
  openFile?: (path: string) => Promise<boolean>;
  previewUrl?: string;
  isPreviewLoading?: boolean;
}

export interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  needsClarification: boolean;
  inputPrompt?: string;
  inputRequired: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export interface WorkflowDisplayProps {
  workflowSteps: any[];
  workflowEndRef: React.RefObject<HTMLDivElement>;
}

export interface FileViewerProps {
  content: string;
  filePath: string;
  onEdit: () => Promise<void>;
  selectedFile: FileSystem | null;
} 