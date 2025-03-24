import { FileSystem, Message, TerminalCommand } from "@/app/contexts/WebSocketContext";

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
  terminalInput: string;
  setTerminalInput: (input: string) => void;
  terminalProcessing: boolean;
  workingDirectory?: string;
  completions: string[];
  showCompletions: boolean;
  selectedCompletion: number;
  selectCompletion: (completion: string) => void;
  setShowCompletions: (show: boolean) => void;
  setSelectedCompletion: (index: number) => void;
  executeTerminalCommand: (command: string) => Promise<void>;
  copiedText: boolean;
  copyTerminalContent: () => void;
  clearTerminal: () => void;
  refreshFileSystem: () => void;
  closeTerminal: () => void;
  terminalInputRef: React.RefObject<HTMLInputElement>;
  terminalEndRef: React.RefObject<HTMLDivElement>;
}

export interface FileEditorProps {
  filePath: string;
  fileContent: string;
  setFileContent: (content: string) => void;
  saveFileContent: () => Promise<void>;
  cancelFileEditing: () => void;
  editorHeight: number;
  handleEditorMouseDown: (e: React.MouseEvent) => void;
  fileEditorRef: React.RefObject<HTMLTextAreaElement>;
}

export interface WorkspaceProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showWorkspace: boolean;
  setShowWorkspace: (show: boolean) => void;
  width: number;
  handleHorizontalMouseDown: (e: React.MouseEvent) => void;
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
  workflowSteps: any[];
  setSelectedFile: (file: FileSystem | null) => void;
  toggleDirectory: (path: string) => void;
  terminal: TerminalCommand[];
  showWelcomeMessage: boolean;
  workingDirectory?: string;
  showTerminal: boolean;
  setShowTerminal: (show: boolean) => void;
  terminalHeight: number;
  handleTerminalMouseDown: (e: React.MouseEvent) => void;
  editingFile: boolean;
  fileContent: string;
  filePath: string;
  setFileContent: (content: string) => void;
  saveFileContent: () => Promise<void>;
  cancelFileEditing: () => void;
  editorHeight: number;
  handleEditorMouseDown: (e: React.MouseEvent) => void;
  terminalInput: string;
  setTerminalInput: (input: string) => void;
  terminalProcessing: boolean;
  completions: string[];
  showCompletions: boolean;
  selectedCompletion: number;
  selectCompletion: (completion: string) => void;
  setShowCompletions: (show: boolean) => void;
  setSelectedCompletion: (index: number) => void;
  executeTerminalCommand: (command: string) => Promise<void>;
  copiedText: boolean;
  copyTerminalContent: () => void;
  clearTerminal: () => void;
  refreshFileSystem: () => void;
  terminalInputRef: React.RefObject<HTMLInputElement>;
  terminalEndRef: React.RefObject<HTMLDivElement>;
  fileEditorRef: React.RefObject<HTMLTextAreaElement>;
  workflowEndRef: React.RefObject<HTMLDivElement>;
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

export interface FileExplorerProps {
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
  toggleDirectory: (path: string) => void;
  selectFile: (file: FileSystem) => void;
}

export interface FileViewerProps {
  selectedFile: FileSystem | null;
} 