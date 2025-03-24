import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket } from '@/app/contexts/WebSocketContext';
import { fetchFileSystem } from '@/lib/chat-utils';
import path from 'path';

export function useTerminal() {
  const webSocket = useWebSocket();
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalProcessing, setTerminalProcessing] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [editingFile, setEditingFile] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [completions, setCompletions] = useState<string[]>([]);
  const [showCompletions, setShowCompletions] = useState(false);
  const [selectedCompletion, setSelectedCompletion] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(130);

  // Reference to the terminal input for focus management
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const fileEditorRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
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
      
      console.log('Completion target:', completionTarget, 'full input:', terminalInput);
      
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
      console.log('Completion results:', result);
      
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
  const selectCompletion = (completion: string) => {
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
      // Use the filesystem API directly instead of the terminal/interactive endpoint
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: fileContent,
          path: filePath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      
      // After successful save, fetch the latest file content
      const getResponse = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Error refreshing file content: ${getResponse.status}`);
      }
      
      // Add success message to terminal
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: `save ${path.basename(filePath)}`,
        output: `File saved successfully: ${path.basename(filePath)}`,
        timestamp: new Date().toISOString()
      });
      
      // Update file system if files were modified
      refreshFileSystem();
      
      console.log('File saved successfully');
      
      // Exit edit mode only if not called from the editor
      if (!webSocket.savingFromEditor) {
        setEditingFile(false);
        setFileContent('');
        setFilePath('');
        
        // Refocus terminal input
        setTimeout(() => {
          terminalInputRef.current?.focus();
        }, 10);
      }
      
    } catch (error) {
      console.error('Error saving file:', error);
      
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: `save ${path.basename(filePath)} (error)`,
        output: `Error saving file: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        error: String(error),
        exitCode: 1
      });
      
      // Re-throw the error so the caller can handle it
      throw error;
    }
  };

  // Cancel file editing without saving
  const cancelFileEditing = () => {
    setEditingFile(false);
    setFileContent('');
    setFilePath('');
    
    webSocket.addTerminalCommand({
      id: uuidv4(),
      command: `vim ${path.basename(filePath)} (cancelled)`,
      output: 'Changes discarded.',
      timestamp: new Date().toISOString()
    });
    
    // Refocus terminal input
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
  
  // Function to refresh the file system
  const refreshFileSystem = async () => {
    try {
      const result = await fetchFileSystem();
      // Add a terminal command to indicate refresh
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: "# Refreshed file system",
        output: "File system refreshed",
        timestamp: new Date().toISOString()
      });
      
      // Update the file system in the webSocket context
      if (result && result.fileSystem) {
        webSocket.updateFileSystem(result.fileSystem);
      }
      
      return result.fileSystem;
    } catch (error) {
      console.error('Failed to refresh file system:', error);
      webSocket.addTerminalCommand({
        id: uuidv4(),
        command: "# Refresh file system",
        output: `Error refreshing file system: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        error: String(error),
        exitCode: 1
      });
      return null;
    }
  };

  // Function to copy terminal content
  const copyTerminalContent = () => {
    const terminalContent = webSocket.terminal.map(cmd => {
      return `$ ${cmd.command}\n${cmd.output || ''}`;
    }).join('\n');
    
    navigator.clipboard.writeText(terminalContent).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Function to clear terminal
  const clearTerminal = () => {
    webSocket.clearTerminal();
    setShowWelcomeMessage(false);
  };

  return {
    terminalInput,
    setTerminalInput,
    terminalProcessing,
    showWelcomeMessage,
    setShowWelcomeMessage,
    copiedText,
    setCopiedText,
    editingFile,
    setEditingFile,
    fileContent,
    setFileContent,
    filePath,
    setFilePath,
    completions,
    setCompletions,
    showCompletions,
    setShowCompletions,
    selectedCompletion,
    setSelectedCompletion,
    showTerminal,
    setShowTerminal,
    terminalHeight,
    setTerminalHeight,
    terminalInputRef,
    fileEditorRef,
    terminalEndRef,
    handleTabCompletion,
    selectCompletion,
    saveFileContent,
    cancelFileEditing,
    executeTerminalCommand,
    refreshFileSystem,
    copyTerminalContent,
    clearTerminal
  };
} 