import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket } from '@/app/contexts/WebSocketContext';
import { fetchFileSystem } from '@/lib/chat-utils';
import { OpenedFile } from '@/types/chat';
import path from 'path';

// Add a helper function for conditional logging
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

// Create an error logging function that works in both dev and production
// but with more details in development mode
const errorLog = (message: string, error?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, error);
  } else {
    // In production, log a simpler message without potentially sensitive details
    console.error(message);
  }
};

// Create a debounced function without requiring the hook
const createDebounceFn = (fn: Function, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      fn(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

export function useTerminal() {
  const webSocket = useWebSocket();
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalProcessing, setTerminalProcessing] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [editingFile, setEditingFile] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [completions, setCompletions] = useState<string[]>([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(130);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for multiple open files
  const [openedFiles, setOpenedFiles] = useState<OpenedFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');

  // Reference to the terminal input for focus management
  const terminalInputRef = useRef<HTMLTextAreaElement>(null);
  const fileEditorRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // Function to refresh the file system
  const refreshFileSystem = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      return null;
    }
    
    try {
      setIsRefreshing(true);
      const result = await fetchFileSystem();
      
      // Don't add terminal commands for refreshes - this was causing an infinite loop
      // as each terminal command would trigger a re-render
      
      // Update the file system in the webSocket context
      if (result && result.fileSystem) {
        webSocket.updateFileSystem(result.fileSystem);
      }
      
      return result?.fileSystem || null;
    } catch (error) {
      console.error('Failed to refresh file system:', error);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [webSocket, isRefreshing]);
  
  // Create a debounced version of the refresh function
  const debouncedRefresh = useCallback(
    createDebounceFn(() => refreshFileSystem(), 500), // Increased to 500ms
    [refreshFileSystem]
  );

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
      
      devLog('Completion target:', completionTarget, 'full input:', terminalInput);
      
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
      devLog('Completion results:', result);
      
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
  const selectCompletion = (index: number) => {
    const completion = completions[index];
    if (!completion) return;
    
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
      // Normalize the path to ensure consistent format
      const normalizedPath = filePath
        .startsWith('/project/') 
        ? filePath.replace(/\/+/g, '/') 
        : `/project/${filePath.replace(/^\/+/, '')}`;
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Save the file with robust cache-busting headers
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${timestamp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          content: fileContent,
          path: normalizedPath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      
      // Get the real filesystem path from the server response
      const saveResult = await response.json();
      const realFilePath = saveResult.realPath || normalizedPath;
      
      // Update the state to reflect saved status
      setOpenedFiles(prev => 
        prev.map(file => 
          file.path === normalizedPath 
            ? { ...file, content: fileContent, hasUnsavedChanges: false } 
            : file
        )
      );
      
      // After saving, refresh the file content to ensure consistency
      const refreshTimestamp = new Date().getTime();
      const getResponse = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${refreshTimestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        if (data.file && data.file.content !== undefined) {
          // Update local state with the refreshed content
          setFileContent(data.file.content);
          
          // Notify other components that this file was saved and refreshed
          const refreshEvent = new CustomEvent('file-refresh-needed', {
            detail: { path: normalizedPath }
          });
          window.dispatchEvent(refreshEvent);
        }
      }
      
      // Trigger file system refresh to update the file explorer
      await refreshFileSystem();
      
      return true;
    } catch (error) {
      errorLog('Error saving file:', error);
      throw error;
    }
  };

  // Helper function to check if any open files have unsaved changes
  const hasUnsavedChangesInAnyFile = () => {
    return openedFiles.some(file => file.hasUnsavedChanges);
  };

  // Cancel file editing without saving
  const cancelFileEditing = () => {
    if (!editingFile) return;
    
    // Check if any files have unsaved changes
    const hasUnsavedChanges = hasUnsavedChangesInAnyFile();
    
    if (hasUnsavedChanges) {
      // Confirm with the user before closing
      const confirmClose = window.confirm('You have unsaved changes in one or more files. Are you sure you want to exit without saving?');
      if (!confirmClose) {
        return; // User canceled, don't close the editor
      }
    }
    
    // Close the current file
    setEditingFile(false);
    setFileContent('');
    setFilePath('');
    setActiveFilePath('');
    
    // Clear opened files
    setOpenedFiles([]);
    
    // Exit edit mode with a new terminal command
    webSocket.addTerminalCommand({
      id: uuidv4(),
      command: 'exit',
      output: hasUnsavedChanges ? 'Exited editor without saving changes' : 'Exited editor',
      timestamp: new Date().toISOString()
    });
    
    // Focus terminal input after exiting edit mode
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
        const newCommand = {
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
          refreshFileSystem();
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
      const newCommand = {
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
        refreshFileSystem();
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

  // Function to copy terminal content
  const copyTerminalContent = () => {
    const terminalCommands = webSocket.terminal.map(cmd => 
      `$ ${cmd.command}\n${cmd.output}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(terminalCommands)
      .then(() => {
        setCopiedText('Terminal content copied to clipboard');
        setTimeout(() => setCopiedText(''), 2000);
      })
      .catch(err => {
        console.error('Error copying terminal content:', err);
        setCopiedText('Failed to copy terminal content');
        setTimeout(() => setCopiedText(''), 2000);
      });
  };

  // Function to clear terminal
  const clearTerminal = () => {
    webSocket.clearTerminal();
    setShowWelcomeMessage(false);
  };

  // Helper function to emit a file switch event
  const emitFileSwitchEvent = (filePath: string, hasUnsavedChanges: boolean) => {
    // Create and dispatch a custom event for file switching
    const event = new CustomEvent('editor-file-switch', {
      detail: {
        path: filePath,
        hasUnsavedChanges
      }
    });
    window.dispatchEvent(event);
    devLog('Emitted file switch event:', { path: filePath, hasUnsavedChanges });
  };

  // Open file content in the editor
  const openFile = async (filePath: string) => {
    try {
      // Normalize the path to ensure proper handling
      const normalizedPath = filePath.startsWith('/project/') 
        ? filePath.replace(/\/+/g, '/') 
        : `/project/${filePath.replace(/^\/+/, '')}`;
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // First check if the file exists using a HEAD request with cache-busting
      try {
        const checkResponse = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${timestamp}`, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!checkResponse.ok) {
          errorLog(`File ${normalizedPath} does not exist or cannot be accessed`);
          return false;
        }
      } catch (headError) {
        errorLog(`Error checking file existence: ${normalizedPath}`, headError);
      }
      
      // Now fetch the full file content with fresh request and a new timestamp
      const fetchTimestamp = new Date().getTime();
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${fetchTimestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.file || data.file.content === undefined) {
        throw new Error('Invalid file data received');
      }
      
      const freshFileContent = data.file.content;
      
      // First, dispatch a file-opened-fresh event so any FileEditor instances can update
      const fileOpenEvent = new CustomEvent('file-opened-fresh', {
        detail: { 
          path: normalizedPath,
          content: freshFileContent
        }
      });
      window.dispatchEvent(fileOpenEvent);
      
      // Wait for the event to be processed before continuing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update terminal editor state
      setFilePath(normalizedPath);
      setFileContent(freshFileContent);
      setEditingFile(true);
      
      // Ensure the file is in our openedFiles array
      setOpenedFiles(prev => {
        // Check if file already exists
        const fileExists = prev.some(file => file.path === normalizedPath);
        
        if (fileExists) {
          // Update existing file
          return prev.map(file => 
            file.path === normalizedPath
              ? { ...file, content: freshFileContent, hasUnsavedChanges: false }
              : file
          );
        } else {
          // Add new file
          return [
            ...prev,
            {
              path: normalizedPath,
              content: freshFileContent,
              hasUnsavedChanges: false
            }
          ];
        }
      });
      
      // Set as active file
      setActiveFilePath(normalizedPath);
      
      // Finally, emit a file switch event for UI components
      const switchEvent = new CustomEvent('editor-file-switch', {
        detail: {
          path: normalizedPath,
          content: freshFileContent,
          hasUnsavedChanges: false
        }
      });
      window.dispatchEvent(switchEvent);
      
      return true;
    } catch (error) {
      errorLog('Error opening file:', error);
      return false;
    }
  };

  // Function to close a specific file
  const closeFile = (path: string) => {
    // Find the file that's about to be closed
    const fileToClose = openedFiles.find(file => file.path === path);
    
    // Check if this file has unsaved changes
    if (fileToClose && fileToClose.hasUnsavedChanges) {
      const confirmClose = window.confirm(`The file ${path.split('/').pop()} has unsaved changes. Are you sure you want to close without saving?`);
      if (!confirmClose) {
        return; // User canceled, don't close the file
      }
    }
    
    // Check if this is the active file
    const isActiveFile = path === activeFilePath;
    
    // Emit file close event to ensure all components are aware
    const closeEvent = new CustomEvent('file-edit-close', {
      detail: { path }
    });
    window.dispatchEvent(closeEvent);
    
    // Remove from opened files list
    const newOpenedFiles = openedFiles.filter(file => file.path !== path);
    setOpenedFiles(newOpenedFiles);
    
    // If no more files, exit editing mode
    if (newOpenedFiles.length === 0) {
      cancelFileEditing();
      return;
    }
    
    // If this was the active file, set a new active file
    if (isActiveFile) {
      const newActivePath = newOpenedFiles[0].path;
      setActiveFilePath(newActivePath);
      setFilePath(newActivePath);
      
      // Update content to show the new active file
      const newActiveFile = newOpenedFiles.find(file => file.path === newActivePath);
      if (newActiveFile) {
        setFileContent(newActiveFile.content);
      }
    }
    
    // Log the file closing action
    devLog(`Closed file: ${path}${fileToClose?.hasUnsavedChanges ? ' (had unsaved changes)' : ''}`);
  };

  // Function to switch between open files
  const switchToFile = (path: string) => {
    // Save current file's unsaved changes before switching
    if (activeFilePath && filePath) {
      setOpenedFiles(prev => 
        prev.map(file => 
          file.path === activeFilePath 
            ? { ...file, content: fileContent, hasUnsavedChanges: file.content !== fileContent } 
            : file
        )
      );
    }
    
    // Find the file in our opened files
    const file = openedFiles.find(file => file.path === path);
    if (!file) return;
    
    // Set as active file
    setActiveFilePath(path);
    setFilePath(path);
    setFileContent(file.content);
    
    // Emit event to notify UI components
    emitFileSwitchEvent(path, file.hasUnsavedChanges);
    
    devLog(`Switched to file: ${path} (content length: ${file.content.length}, has unsaved changes: ${file.hasUnsavedChanges})`);
  };

  return {
    terminalInput,
    setTerminalInput,
    terminalProcessing,
    showWelcomeMessage,
    copiedText,
    setCopiedText,
    editingFile,
    fileContent,
    setFileContent,
    filePath,
    completions,
    showCompletions,
    selectedCompletion,
    showTerminal,
    setShowTerminal,
    executeTerminalCommand,
    saveFileContent,
    cancelFileEditing,
    copyTerminalContent,
    clearTerminal,
    refreshFileSystem,
    debouncedRefresh,
    terminalInputRef,
    fileEditorRef,
    terminalEndRef,
    handleTabCompletion,
    selectCompletion,
    setShowCompletions,
    setSelectedCompletion,
    openFile,
    openedFiles,
    activeFilePath,
    closeFile,
    switchToFile
  };
} 