import { WorkspaceProps } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal as TerminalIcon, FolderOpen, FolderClosed, ChevronLeft, ChevronRight, X, Trash2, Copy } from "lucide-react";
import { WorkflowDisplay } from "./WorkflowDisplay";
import { EnhancedFileExplorer } from "./EnhancedFileExplorer";
import { FileViewer } from "./FileViewer";
import { Terminal } from "./Terminal";
import FileEditor from "./FileEditor";
import { ResizeHandle } from "./ResizeHandle";
import { ProjectSelector } from "./ProjectSelector";
import { useState, useRef, useEffect } from "react";
import { FileSystem, Project } from "@/types/chat";
import { ProjectConfigModal } from "./ProjectConfigModal";
import { Preview } from "./Preview";
import { useResizing } from "@/hooks/useResizing";
import { useFileSystem } from "@/hooks/useFileSystem";
import { FileCompare } from "./FileCompare";
import { FileSearchModal } from "./FileSearchModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useFileOperations } from "@/hooks/useFileOperations";
import { toast } from "sonner";
import { ScriptEditorPanel } from "./index";
import { getFileNameFromPath } from "@/utils/file-utils";
import { EditorFile } from "./EditorManager";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Workspace({
  activeTab,
  setActiveTab,
  showWorkspace,
  setShowWorkspace,
  width,
  fileSystem,
  selectedFile,
  workflowSteps,
  setSelectedFile,
  toggleDirectory,
  terminal,
  showWelcomeMessage,
  workingDirectory,
  showTerminal,
  setShowTerminal,
  editingFile,
  fileContent,
  filePath,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  terminalInput,
  setTerminalInput,
  terminalProcessing,
  completions,
  showCompletions,
  selectedCompletion,
  selectCompletion,
  setShowCompletions,
  setSelectedCompletion,
  executeTerminalCommand,
  copiedText,
  copyTerminalContent,
  clearTerminal,
  refreshFileSystem,
  terminalInputRef,
  terminalEndRef,
  fileEditorRef,
  workflowEndRef,
  previewUrl,
  isPreviewLoading,
  openFile
}: WorkspaceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState('');
  const [currentFileContent, setCurrentFileContent] = useState('');
  const [minimizedPanel, setMinimizedPanel] = useState<'none' | 'fileExplorer' | 'chat' | 'preview'>('none');
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectConfig, setShowProjectConfig] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareFiles, setCompareFiles] = useState<{
    file1: { path: string; name: string; content: string; };
    file2: { path: string; name: string; content: string; };
  } | null>(null);
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<any>(null);
  const [openedFiles, setOpenedFiles] = useState<{ path: string; content: string; hasUnsavedChanges: boolean }[]>([]);
  const [activeFilePath, setActiveFilePath] = useState('');
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [compareMenuPosition, setCompareMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Get resize handlers and state from custom hook
  const { 
    workspaceWidth,
    setWorkspaceWidth,
    fileExplorerWidth,
    setFileExplorerWidth,
    projectListWidth,
    setProjectListWidth,
    handleProjectListResize,
    terminalHeight,
    setTerminalHeight,
    editorHeight,
    setEditorHeight,
    handleHorizontalMouseDown,
    handleFileExplorerResize,
    handleTerminalMouseDown: _handleTerminalMouseDown,
    handleEditorMouseDown,
    terminalRef,
    editorRef
  } = useResizing();

  // Custom terminal resize handler that works with our absolute positioning
  const handleTerminalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const workspaceHeight = document.querySelector('.workspace-container')?.clientHeight || window.innerHeight;
    const terminalContainer = document.querySelector('.terminal-container') as HTMLElement;
    const startHeight = terminalContainer?.clientHeight || 0;
    
    // Remove any transition for direct resizing
    if (terminalContainer) {
      terminalContainer.style.transition = '';
    }
    
    // Add resize-active class to prevent text selection
    document.body.classList.add('resize-active');
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!terminalContainer) return;
      
      const delta = startY - e.clientY;
      const newHeight = startHeight + delta;
      const percentHeight = Math.min(Math.max((newHeight / workspaceHeight) * 100, 10), 70);
      
      terminalContainer.style.height = `${percentHeight}%`;
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Remove resize-active class when done
      document.body.classList.remove('resize-active');
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get the file operations from the useFileSystem hook
  const fileSystemHook = useFileSystem();
  const { deleteFileOrDirectory, setFileSystem } = fileSystemHook;

  // Extract the project from fileSystem to avoid TypeScript errors
  const currentProject = Array.isArray(fileSystem) && fileSystem.length > 0 
    ? (fileSystem[0] as any)?.project 
    : null;

  // Track open editor files with a more robust structure
  const [openEditorFiles, setOpenEditorFiles] = useState<EditorFile[]>([]);
  const [activeEditorFilePath, setActiveEditorFilePath] = useState<string | null>(null);

  // Update the safeRefresh function to match the expected Promise<void> type
  const safeRefresh = async (): Promise<void> => {
    // Use the provided refreshFileSystem from props
    if (typeof refreshFileSystem === 'function') {
      try {
        // Add a small delay before refreshing to ensure file operations have completed
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshFileSystem();

        // Perform a second refresh after a short delay to ensure consistency
        setTimeout(async () => {
          try {
            await refreshFileSystem();
          } catch (error) {
            console.error('Error in delayed refresh:', error);
          }
        }, 500);
      } catch (error) {
        console.error('Error refreshing file system:', error);
        
        // Try one more time with a direct fetch approach
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`/api/filesystem?_ts=${timestamp}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result && result.fileSystem) {
              console.log('Manual file system refresh succeeded');
            }
          }
        } catch (fallbackError) {
          console.error('Fallback refresh also failed:', fallbackError);
        }
      }
    }
  };

  // Add a utility function to verify file existence
  const verifyFileExists = async (filePath: string): Promise<boolean> => {
    try {
      const normalizedPath = filePath
        .startsWith('/project/') 
        ? filePath.replace(/\/+/g, '/') 
        : `/project/${filePath.replace(/^\/+/, '')}`;
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${timestamp}`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  };

  // Helper function to normalize file paths consistently
  const normalizePath = (path: string): string => {
    return path.startsWith('/project/') 
      ? path.replace(/\/+/g, '/') 
      : `/project/${path.replace(/^\/+/, '')}`;
  };

  // Helper function to check if a file exists
  const isFileExists = (filePath: string): boolean => {
    const isInFileSystem = (items: any[]): boolean => {
      for (const item of items) {
        if (item.type === 'file' && normalizePath(item.path) === normalizePath(filePath)) {
          return true;
        }
        if (item.children) {
          const found = isInFileSystem(item.children);
          if (found) return true;
        }
      }
      return false;
    };
    
    return isInFileSystem(Array.isArray(fileSystem) ? fileSystem : []);
  };

  // Update selectFile to prioritize switching to already open files
  const selectFile = async (file: FileSystem) => {
    if (file.type === 'directory') {
      toggleDirectory(file.path);
      return;
    }
    
    // For files, check if it exists before proceeding
    const filePathExists = isFileExists(file.path);
    if (!filePathExists) {
      console.error(`File not found: ${file.path}`);
      toast.error(`The file "${file.name}" doesn't exist or can't be accessed.`);
      return;
    }

    const normalizedPath = normalizePath(file.path);
    console.log(`Opening/switching to file: ${normalizedPath}`);
    
    // Always set active tab to editor and update selectedFile
    setActiveTab('editor');
    setSelectedFile(file);
    
    // Check if this file is already open in EditorManager
    const fileAlreadyOpen = openEditorFiles.some(f => f.path === normalizedPath);
    
    if (fileAlreadyOpen) {
      console.log(`File already open: ${normalizedPath}. Switching to it.`);
      // Important: Set this file as the active file
      setActiveEditorFilePath(normalizedPath);
      
      // If using terminal's editor, also switch there
      if (terminal && typeof terminal === 'object' && 'switchToFile' in terminal && typeof terminal.switchToFile === 'function') {
        terminal.switchToFile(normalizedPath);
      }
      
      // Set this file as active in the internal editor state too
      if (isEditing) {
        const fileInOpenedFiles = openedFiles.find(f => f.path === normalizedPath);
        if (fileInOpenedFiles) {
          setActiveFilePath(normalizedPath);
          setCurrentFilePath(normalizedPath);
          setCurrentFileContent(fileInOpenedFiles.content);
        }
      }
      
      // Force an event to notify editor components about the switch
      const switchEvent = new CustomEvent('file-switch', {
        detail: { path: normalizedPath }
      });
      window.dispatchEvent(switchEvent);
      return;
    }
    
    // If not already open, continue with opening the file...
    
    // If we have an external openFile function, use it
    if (typeof openFile === 'function') {
      try {
        // First, fetch the content to ensure the file exists and is readable
        const content = await fetchFileContent(normalizedPath);
        if (content === null) {
          toast.error(`Could not read file: ${getFileNameFromPath(normalizedPath)}`);
          return;
        }
        
        // Dispatch file opened event
        const fileOpenEvent = new CustomEvent('file-opened-fresh', {
          detail: { 
            path: normalizedPath,
            content
          }
        });
        window.dispatchEvent(fileOpenEvent);
        
        // Add the new file to our open files
        setOpenEditorFiles(prevFiles => [...prevFiles, {
          path: normalizedPath,
          name: file.name,
          content: content,
          hasUnsavedChanges: false
        }]);
        setActiveEditorFilePath(normalizedPath);
        
        // Now also call the openFile function to open it in the terminal's editor
        const success = await openFile(normalizedPath);
        
        if (!success) {
          console.error('Failed to open file using openFile function');
          toast.error(`Could not open file: ${file.name}`);
        }
      } catch (error) {
        console.error('Error opening file:', error);
        toast.error(`Error opening file: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      return;
    }
    
    // If not using external openFile, use our internal implementation
    try {
      const content = await fetchFileContent(normalizedPath);
      if (content === null) {
        toast.error(`Could not read file: ${getFileNameFromPath(normalizedPath)}`);
        return;
      }
      
      // Mark file as selected in file explorer
      setSelectedFile(file);
      
      // Check if file is already open
      const existingFileIndex = openedFiles.findIndex(f => f.path === normalizedPath);
      
      if (existingFileIndex >= 0) {
        // File already exists, just switch to it
        setActiveFilePath(normalizedPath);
        setCurrentFilePath(normalizedPath);
        setCurrentFileContent(openedFiles[existingFileIndex].content);
        
        // If content changed on disk, ask to reload
        if (openedFiles[existingFileIndex].content !== content) {
          const shouldUpdate = window.confirm(
            `The file "${getFileNameFromPath(normalizedPath)}" has changed on disk. Load the new content?`
          );
          
          if (shouldUpdate) {
            // Update content
            setOpenedFiles(prev => 
              prev.map(f => 
                f.path === normalizedPath
                  ? { ...f, content, hasUnsavedChanges: false }
                  : f
              )
            );
            setCurrentFileContent(content);
          }
        }
      } else {
        // Add new file to openedFiles
        setOpenedFiles(prev => [
          ...prev, 
          { 
            path: normalizedPath, 
            content,
            hasUnsavedChanges: false 
          }
        ]);
        
        setActiveFilePath(normalizedPath);
        setCurrentFilePath(normalizedPath);
        setCurrentFileContent(content);
      }
      
      // Set editing mode to true
      setIsEditing(true);
      
      // Dispatch event
      const fileOpenedEvent = new CustomEvent('file-opened-fresh', {
        detail: {
          path: normalizedPath,
          content
        }
      });
      window.dispatchEvent(fileOpenedEvent);
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error(`Error loading file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Close the terminal panel
  const closeTerminal = () => {
    setShowTerminal(false);
  };
  
  // Function to handle file editing
  const handleEditFile = async (file: any) => {
    try {
      // Ensure the file path is properly formatted
      const filePath = file.path.startsWith('/project/') ? file.path : `/project/${file.path}`;
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}&_ts=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.file) {
        // We got a direct file response
        setCurrentFileContent(data.file.content);
        setCurrentFilePath(data.file.path);
        setIsEditing(true);
      } else if (data.fileSystem && data.fileSystem.length > 0) {
        // Find the file in the fileSystem array
        const findFile = (items: any[]): any => {
          for (const item of items) {
            if (item.path === filePath) {
              return item;
            }
            if (item.children) {
              const found = findFile(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const fileItem = findFile(data.fileSystem);
        if (fileItem && fileItem.content !== undefined) {
          setCurrentFileContent(fileItem.content);
          setCurrentFilePath(fileItem.path);
          setIsEditing(true);
        } else {
          throw new Error('File content not found');
        }
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
      toast.error(`Failed to load file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Function to handle file saving
  const handleSaveFile = async () => {
    try {
      if (!selectedFile) {
        throw new Error('No file selected');
      }

      // Ensure the file path is properly formatted
      const filePath = selectedFile.path.startsWith('/project/') 
        ? selectedFile.path 
        : `/project/${selectedFile.path}`;
      
      // Get the current content
      const content = currentFileContent;
      
      if (content === undefined || content === null) {
        throw new Error('No content to save');
      }

      console.log('Saving file:', { filePath, contentLength: content.length });

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}&_ts=${timestamp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          content,
          path: filePath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }

      // After successful save, fetch the latest file content with cache busting
      const getResponse = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}&_ts=${new Date().getTime()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Error refreshing file content: ${getResponse.status}`);
      }

      const data = await getResponse.json();
      if (data.file) {
        setCurrentFileContent(data.file.content);
        // Update the selected file's content
        if (selectedFile) {
          selectedFile.content = data.file.content;
        }
        
        // Also update the file in openedFiles if it's there
        setOpenedFiles(prev => 
          prev.map(f => 
            f.path === filePath
              ? { ...f, content: data.file.content, hasUnsavedChanges: false }
              : f
          )
        );
      }
      
      // Refresh the file system to show updated content
      await refreshFileSystem();
      
      console.log('File saved successfully');
      toast.success('File saved successfully');
      
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Function to handle canceling file editing
  const handleCancelEditing = () => {
    // Check if any files have unsaved changes
    const hasUnsavedChanges = openedFiles.some(file => file.hasUnsavedChanges);
    
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm("You have unsaved changes. Are you sure you want to close the editor?");
      if (!shouldClose) {
        return;
      }
    }
    
    setIsEditing(false);
    setOpenedFiles([]);
    setActiveFilePath('');
    setCurrentFilePath('');
    setCurrentFileContent('');
  };

  // Function to handle panel minimization
  const handleMinimizePanel = (panel: 'fileExplorer' | 'chat' | 'preview') => {
    setMinimizedPanel(panel);
  };

  // Function to handle panel maximization
  const handleMaximizePanel = () => {
    setMinimizedPanel('none');
  };

  // Function to handle project selection
  const handleProjectSelect = async (project: Project) => {
    console.log('Selecting project:', project);
    const updatedProject = {
      id: project.name,
      name: project.name,
      path: project.path.startsWith('/project/') ? project.path : `/project/${project.name}`,
      lastAccessed: new Date().toISOString(),
      config: {
        description: project.config?.description || `Project ${project.name}`,
        type: project.config?.type || 'web',
        language: project.config?.language || 'typescript',
        framework: project.config?.framework
      }
    };
    setSelectedFile(null);
    setIsEditing(false);
    setCurrentFileContent('');
    setCurrentFilePath('');

    try {
      // Update working directory in terminal
      await executeTerminalCommand(`cd ${project.name}\r`);
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error switching project:', error);
    }
  };

  // Function to execute terminal commands
  const handleExecuteTerminalCommand = async (command: string) => {
    try {
      // Execute the command
      await executeTerminalCommand(command.trim());
      
      // Check if the command modifies the file system
      const fileSystemCommands = ['mkdir', 'touch', 'rm', 'mv', 'cp', 'echo', '>', '>>', 'cat', 'git'];
      const isFileSystemCommand = fileSystemCommands.some(cmd => command.toLowerCase().trim().startsWith(cmd));
      
      // Refresh file system if it's a file system command
      if (isFileSystemCommand) {
        try {
          await refreshFileSystem();
        } catch (error) {
          console.error('Error refreshing file system:', error);
          // If the first attempt fails, try again after a short delay
          setTimeout(async () => {
            try {
              await refreshFileSystem();
            } catch (retryError) {
              console.error('Error refreshing file system after retry:', retryError);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error executing terminal command:', error);
    }
  };

  const handleCreateProject = async (project: Project) => {
    console.log('Creating new project:', project);
    const updatedProject = {
      id: project.name,
      name: project.name,
      path: project.path.startsWith('/project/') ? project.path : `/project/${project.name}`,
      lastAccessed: new Date().toISOString(),
      config: {
        description: project.config?.description || `Project ${project.name}`,
        type: project.config?.type || 'web',
        language: project.config?.language || 'typescript',
        framework: project.config?.framework
      }
    };
    setIsCreating(false);
    setSelectedFile(null);
    setIsEditing(false);
    setCurrentFileContent('');
    setCurrentFilePath('');

    try {
      // Update working directory in terminal
      await executeTerminalCommand(`cd ${project.path}\r`);
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleTerminalToggle = () => {
    // Simply toggle the terminal visibility
    setShowTerminal(!showTerminal);
    
    // Reset terminal height to default 30% when opening
    if (!showTerminal) {
      const terminalContainer = document.querySelector('.terminal-container') as HTMLElement;
      if (terminalContainer) {
        // Add transition for smooth animation
        terminalContainer.style.transition = 'height 0.2s ease-in-out';
        terminalContainer.style.height = '30%';
        
        // Remove transition after animation completes
        setTimeout(() => {
          if (terminalContainer) {
            terminalContainer.style.transition = '';
          }
        }, 200);
      }
    }
  };

  const handleOpenProjectConfig = () => {
    setShowProjectConfig(true);
  };

  const handleSaveProjectConfig = (updatedProject: Project) => {
    setShowProjectConfig(false);
  };

  // We need to correctly initialize and use the fileOperations hook 
  // Use the file operations hook to simplify file operations:
  const fileOperations = useFileOperations({
    refreshFileSystem: safeRefresh
  });

  // And update the handlers to use fileOperations again
  const handleDeleteFile = (file: FileSystem) => {
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      fileOperations.deleteFile(file);
    }
  };
  
  const handleMoveFile = async (sourceFile: FileSystem, targetDir: FileSystem) => {
    return fileOperations.moveFile(sourceFile, targetDir);
  };

  const handleRenameFile = async (file: FileSystem, newName: string): Promise<void> => {
    await fileOperations.renameFile(file, newName);
  };
  
  const handleCreateFile = async (path: string, name: string, isDirectory: boolean): Promise<void> => {
    await fileOperations.createFile(path, name, isDirectory);
  };
  
  const handleCopyFile = (file: FileSystem) => {
    fileOperations.copyFile(file);
  };
  
  const handlePasteFile = async (targetDir: FileSystem): Promise<void> => {
    await fileOperations.pasteFile(targetDir);
  };

  // Add this if we're using cutting functionality
  const handleCutFile = (file: FileSystem) => {
    fileOperations.handleCutFile(file);
  };

  // Handler for selecting a file for comparison
  const handleSelectForCompare = (file: any, event?: React.MouseEvent) => {
    if (file.type !== 'file') return;
    
    setSelectedForCompare(file);
    setCompareMenuOpen(true);
    
    // Set position for context menu
    if (event) {
      const { clientX, clientY } = event;
      setCompareMenuPosition({ x: clientX, y: clientY });
    } else {
      // Center on screen if no event
      setCompareMenuPosition(null);
    }
  };
  
  // Close the compare menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compareMenuOpen) {
        const target = event.target as HTMLElement;
        const menuElement = document.querySelector('.compare-menu');
        
        if (menuElement && !menuElement.contains(target)) {
          setCompareMenuOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [compareMenuOpen]);

  // Handler for comparing files
  const handleCompareFiles = async (file1: any, file2: any) => {
    setIsComparing(true);
    setCompareMenuOpen(false);
    setSelectedForCompare(null);
    
    try {
      // Get file contents
      const file1Content = await fetchFileContent(file1.path);
      const file2Content = await fetchFileContent(file2.path);
      
      if (file1Content && file2Content) {
        setCompareFiles({
          file1: {
            path: file1.path,
            name: file1.name,
            content: file1Content
          },
          file2: {
            path: file2.path, 
            name: file2.name,
            content: file2Content
          }
        });
      } else {
        console.error('Could not load file contents for comparison');
        setIsComparing(false);
      }
    } catch (error) {
      console.error('Error setting up file comparison:', error);
      setIsComparing(false);
    }
  };

  // Handler for closing file comparison
  const handleCloseCompare = () => {
    setIsComparing(false);
    setCompareFiles(null);
    setSelectedForCompare(null);
  };

  // Context menu for file comparison
  const renderCompareMenu = () => {
    if (!compareMenuOpen || !selectedForCompare) return null;
    
    // Find other files that can be compared with the selected file
    const findComparableFiles = (items: any[]): any[] => {
      let result: any[] = [];
      
      items.forEach(item => {
        if (item.type === 'file' && item.path !== selectedForCompare.path) {
          result.push(item);
        }
        
        if (item.type === 'directory' && item.children) {
          result = [...result, ...findComparableFiles(item.children)];
        }
      });
      
      return result;
    };
    
    const comparableFiles = findComparableFiles(fileSystem || []);
    
    return (
      <div
        className="absolute z-30 bg-[#212121] border border-[#2A2A2A] rounded shadow-lg p-2 max-h-60 overflow-y-auto compare-menu"
        style={{
          top: compareMenuPosition?.y || '50%',
          left: compareMenuPosition?.x || '50%',
          transform: compareMenuPosition ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <div className="text-xs font-medium text-gray-400 mb-2 px-2">
          Compare {selectedForCompare.name} with:
        </div>
        {comparableFiles.length > 0 ? (
          <div className="space-y-1">
            {comparableFiles.map(file => (
              <div 
                key={file.path}
                className="px-2 py-1 text-xs hover:bg-[#2A2A2A] cursor-pointer rounded"
                onClick={() => handleCompareFiles(selectedForCompare, file)}
              >
                {file.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 px-2 py-1">
            No other files available for comparison
          </div>
        )}
        <div className="border-t border-[#2A2A2A] mt-2 pt-2">
          <div 
            className="px-2 py-1 text-xs hover:bg-[#2A2A2A] cursor-pointer rounded text-gray-400"
            onClick={() => setCompareMenuOpen(false)}
          >
            Cancel
          </div>
        </div>
      </div>
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('Workspace state updated - isEditing:', isEditing, 'editingFile:', editingFile, 'selectedFile:', selectedFile?.path);
  }, [isEditing, editingFile, selectedFile]);

  // Add a listener for filesystem change events
  useEffect(() => {
    const handleFileSystemChange = (event: Event) => {
      // Get the details from the custom event
      const customEvent = event as CustomEvent;
      const { path, action } = customEvent.detail || {};
      
      console.log(`File system change detected: ${action} on ${path}`);
      
      // If the file that was deleted is currently selected, clear selection
      if (action === 'delete' && selectedFile && selectedFile.path === path) {
        setSelectedFile(null);
        setIsEditing(false);
        setCurrentFileContent('');
        setCurrentFilePath('');
      }
      
      // Refresh the file system
      if (typeof refreshFileSystem === 'function') {
        console.log('Refreshing file system due to detected change');
        refreshFileSystem();
        
        // Double refresh after a short delay
        setTimeout(() => {
          refreshFileSystem();
        }, 500);
      }
    };
    
    // Add the event listener
    window.addEventListener('filesystem-changed', handleFileSystemChange);
    
    // Remove the event listener on cleanup
    return () => {
      window.removeEventListener('filesystem-changed', handleFileSystemChange);
    };
  }, [selectedFile, refreshFileSystem]);

  // Add a keyboard shortcut to open file search:
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P or Cmd+P to open file search
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsFileSearchOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add the missing fetchFileContent function
  const fetchFileContent = async (filePath: string): Promise<string | null> => {
    try {
      const normalizedPath = filePath
        .startsWith('/project/') 
        ? filePath.replace(/\/+/g, '/') 
        : `/project/${filePath.replace(/^\/+/, '')}`;

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}&_ts=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch file content:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      if (data && data.file && data.file.content !== undefined) {
        return data.file.content;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching file content:', error);
      return null;
    }
  };

  // Use keyboard shortcuts for file operations
  useKeyboardShortcuts({
    selectedFile,
    onDelete: async (file) => {
      if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
        await fileOperations.deleteFile(file);
      }
    },
    onCopy: handleCopyFile,
    onCut: handleCutFile,
    onPaste: async (dir) => {
      if (dir.type === 'directory') {
        await handlePasteFile(dir);
      }
    },
    onRename: (file) => {
      // Start file rename operation via the context menu
      // This would typically be handled by handleSelectForCompare
      handleSelectForCompare(file);
    },
    onNewFile: () => {
      // Create a new file in the current directory
      const path = selectedFile?.type === 'directory' ? 
        selectedFile.path : 
        workingDirectory || '';
      handleCreateFile(path, 'new-file.js', false);
    },
    onNewFolder: () => {
      // Create a new folder in the current directory
      const path = selectedFile?.type === 'directory' ? 
        selectedFile.path : 
        workingDirectory || '';
      handleCreateFile(path, 'new-folder', true);
    },
    onRefresh: safeRefresh,
    // Disable shortcuts when editing a file or the file search is open
    disableShortcuts: isEditing || isFileSearchOpen
  });

  return (
    <div className="h-full w-full flex flex-row relative workspace-container">
      {/* File explorer */}
      <div className="flex flex-col h-full bg-[#1A1A1A] border-r border-[#2A2A2A]" style={{ width: `${fileExplorerWidth}px` }}>
        {/* File Explorer */}
        <div className="flex-1 overflow-auto">
          <EnhancedFileExplorer
            fileSystem={fileSystem}
            selectedFile={selectedFile}
            onSelectFile={selectFile}
            onToggleDirectory={toggleDirectory}
            workingDirectory={workingDirectory}
            onDeleteFile={handleDeleteFile}
            onMoveFile={handleMoveFile}
            onCompareFile={handleSelectForCompare}
            onRenameFile={handleRenameFile}
            onCreateFile={handleCreateFile}
            onCopy={handleCopyFile}
            onPaste={handlePasteFile}
            onRefresh={safeRefresh}
            width={fileExplorerWidth}
            onOpenSearch={() => setIsFileSearchOpen(true)}
          />
        </div>
      </div>
      
      {/* Resize handle between file explorer and main area */}
      <ResizeHandle 
        direction="horizontal" 
        onMouseDown={handleFileExplorerResize} 
        className="w-1 bg-[#2A2A2A] hover:bg-blue-500 transition-colors"
      />
      
      {/* Main content area with tabs */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Tabs Navigation */}
        <div className="flex-none bg-[#181818] border-b border-[#2D2D2D] flex justify-between items-center">
          <Tabs value={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="bg-transparent border-b border-[#2D2D2D] rounded-none h-10 gap-2 px-2">
              <TabsTrigger
                value="workflow"
                className="h-8 flex items-center gap-1 text-xs font-normal data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white rounded-none px-3 py-0"
              >
                Workflow
              </TabsTrigger>
              <TabsTrigger
                value="editor"
                className="h-8 flex items-center gap-1 text-xs font-normal data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white rounded-none px-3 py-0"
              >
                Editor
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="h-8 flex items-center gap-1 text-xs font-normal data-[state=active]:border-b data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white rounded-none px-3 py-0"
              >
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-1 pr-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 rounded-full p-0" 
              onClick={() => setShowWorkspace(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Workflow Tab */}
          {activeTab === 'workflow' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-auto bg-[#121212] p-2">
                <WorkflowDisplay 
                  workflowSteps={workflowSteps || []}
                  workflowEndRef={workflowEndRef}
                />
              </div>
            </div>
          )}
          
          {/* Editor Tab */}
          {activeTab === 'editor' && (
            <div className="flex flex-col h-full">
              {/* File content area */}
              <div 
                className="flex-1 flex flex-col overflow-hidden bg-[#121212]"
              >
                {editingFile || isEditing ? (
                  <ScriptEditorPanel 
                    fileContent={editingFile ? fileContent : currentFileContent}
                    setFileContent={editingFile ? setFileContent : setCurrentFileContent}
                    saveFileContent={editingFile ? saveFileContent : handleSaveFile}
                    cancelFileEditing={editingFile ? cancelFileEditing : handleCancelEditing}
                    filePath={editingFile ? 
                      (terminal && typeof terminal === 'object' && 'activeFilePath' in terminal && terminal.activeFilePath ? 
                        String(terminal.activeFilePath) : filePath) : 
                      currentFilePath}
                    fileEditorRef={fileEditorRef}
                    openFiles={editingFile ? 
                      (terminal && typeof terminal === 'object' && 'openedFiles' in terminal ? 
                        (terminal.openedFiles as any[]) : []) : 
                      openedFiles}
                    activeFilePath={editingFile ? 
                      (terminal && typeof terminal === 'object' && 'activeFilePath' in terminal ? 
                        String(terminal.activeFilePath) : filePath) : 
                      activeFilePath}
                    onOpenFile={async (path: string, content: string) => {
                      // Always normalize path first
                      const normalizedPath = normalizePath(path);
                      
                      if (editingFile && terminal && typeof terminal === 'object' && 'openFile' in terminal && typeof terminal.openFile === 'function') {
                        // If using the terminal's editor, just open the file
                        return terminal.openFile(normalizedPath);
                      } else {
                        // Using workspace's internal editor, add to our local state
                        // Check if the file already exists
                        const existingIndex = openedFiles.findIndex(file => file.path === normalizedPath);
                        
                        if (existingIndex >= 0) {
                          // Just update the file if needed
                          const existingContent = openedFiles[existingIndex].content;
                          const hasUnsavedChanges = existingContent !== content;
                          
                          if (hasUnsavedChanges) {
                            setOpenedFiles(prev => prev.map(file => 
                              file.path === normalizedPath 
                                ? { ...file, content, hasUnsavedChanges: false }
                                : file
                            ));
                          }
                        } else {
                          // Add a new file
                          setOpenedFiles(prev => [
                            ...prev,
                            { path: normalizedPath, content, hasUnsavedChanges: false }
                          ]);
                        }
                      
                        setActiveFilePath(normalizedPath);
                        setCurrentFilePath(normalizedPath);
                        setCurrentFileContent(content);
                        return true;
                      }
                    }}
                    onCloseFile={(path: string) => {
                      // Always normalize path
                      const normalizedPath = normalizePath(path);
                      
                      if (editingFile && terminal && typeof terminal === 'object' && 'closeFile' in terminal && typeof terminal.closeFile === 'function') {
                        // Using terminal's editor
                        terminal.closeFile(normalizedPath);
                      } else {
                        // If this is the last file, cancel editing
                        if (openedFiles.length === 1) {
                          handleCancelEditing();
                          return;
                        }
                        
                        // Remove the file
                        const newOpenedFiles = openedFiles.filter(file => file.path !== normalizedPath);
                        setOpenedFiles(newOpenedFiles);
                        
                        // If removing active file, switch to another
                        if (normalizedPath === activeFilePath) {
                          const newActivePath = newOpenedFiles[0]?.path;
                          if (newActivePath) {
                            setActiveFilePath(newActivePath);
                            setCurrentFilePath(newActivePath);
                            
                            const newActiveFile = newOpenedFiles.find(file => file.path === newActivePath);
                            if (newActiveFile) {
                              setCurrentFileContent(newActiveFile.content);
                            }
                          }
                        }
                      }
                    }}
                    onSwitchFile={(path: string) => {
                      // Always normalize path
                      const normalizedPath = normalizePath(path);
                      
                      if (editingFile && terminal && typeof terminal === 'object' && 'switchToFile' in terminal && typeof terminal.switchToFile === 'function') {
                        // Using terminal's editor
                        terminal.switchToFile(normalizedPath);
                      } else {
                        // Before switching, save the current content
                        if (activeFilePath && activeFilePath !== normalizedPath) {
                          // Save current content to openedFiles
                          setOpenedFiles(prev => {
                            return prev.map(file => 
                              file.path === activeFilePath 
                                ? { 
                                    ...file, 
                                    content: currentFileContent, 
                                    hasUnsavedChanges: file.content !== currentFileContent 
                                } 
                                : file
                            );
                          });
                        }
                        
                        // Switch to the file
                        const file = openedFiles.find(file => file.path === normalizedPath);
                        if (file) {
                          // Update path first
                          setActiveFilePath(normalizedPath);
                          setCurrentFilePath(normalizedPath);
                          
                          // Then content
                          setCurrentFileContent(file.content);
                        }
                      }
                    }}
                    fetchScriptContent={fetchFileContent}
                    height="100%"
                  />
                ) : selectedFile ? (
                  <FileViewer 
                    content={selectedFile.content || ''} 
                    filePath={selectedFile.path}
                    onEdit={() => handleEditFile(selectedFile)}
                    selectedFile={selectedFile}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FolderOpen className="mx-auto h-12 w-12 opacity-50 mb-2" />
                      <p>Select a file to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <Preview url={previewUrl || ''} isLoading={isPreviewLoading} />
          )}
        </div>
      </div>
      
      {/* File Search Modal */}
      <FileSearchModal
        isOpen={isFileSearchOpen}
        onClose={() => setIsFileSearchOpen(false)}
        fileSystem={fileSystem}
        onSelectFile={selectFile}
      />
      
      {/* Compare menu */}
      {compareMenuOpen && renderCompareMenu()}
      
      {/* File comparison view */}
      {isComparing && compareFiles && (
        <div className="absolute inset-0 z-20 bg-[#121212]">
          <FileCompare
            file1={compareFiles.file1}
            file2={compareFiles.file2}
            onClose={handleCloseCompare}
          />
        </div>
      )}
      
      {/* Terminal toggle button - always visible */}
      <button
        className="absolute left-4 bottom-4 z-20 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg"
        onClick={handleTerminalToggle}
        title={showTerminal ? "Hide Terminal" : "Show Terminal"}
      >
        <TerminalIcon size={16} />
      </button>

      {/* Terminal Panel - Positioned at the bottom of the entire workspace */}
      {showTerminal && (
        <div className="absolute left-0 right-0 bottom-0 z-30 terminal-container shadow-lg" style={{ height: "30%" }}>
          {/* Terminal resize handle - make it more visible and easier to grab */}
          <div 
            className="absolute top-0 left-0 right-0 h-2 -mt-1 bg-[#2A2A2A] hover:bg-blue-500 cursor-ns-resize z-20 flex items-center justify-center"
            onMouseDown={handleTerminalMouseDown}
          >
            <div className="w-10 h-1 bg-gray-500 rounded-full hover:bg-blue-400"></div>
          </div>
          <div className="h-full border-t border-[#2A2A2A] bg-[#1A1A1A] flex flex-col">
            <div className="flex items-center justify-between p-1 bg-[#212121] border-b border-[#2A2A2A]">
              <div className="text-xs font-medium text-gray-400 px-2">Terminal <span className="text-gray-500">({workingDirectory})</span></div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={copyTerminalContent}
                  title="Copy Terminal Content"
                >
                  <Copy size={13} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={clearTerminal}
                  title="Clear Terminal"
                >
                  <Trash2 size={13} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setShowTerminal(false)}
                  title="Close Terminal"
                >
                  <X size={13} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-[#1A1A1A]">
              <Terminal 
                terminal={terminal}
                showWelcomeMessage={showWelcomeMessage}
                input={terminalInput}
                setInput={setTerminalInput}
                isProcessing={terminalProcessing}
                onSendCommand={handleExecuteTerminalCommand}
                workingDirectory={workingDirectory}
                completions={completions}
                showCompletions={showCompletions}
                selectedCompletion={selectedCompletion}
                onSelectCompletion={selectCompletion}
                setShowCompletions={setShowCompletions}
                setSelectedCompletion={setSelectedCompletion}
                terminalInputRef={terminalInputRef}
                terminalEndRef={terminalEndRef}
                copiedText={copiedText}
                copyTerminalContent={copyTerminalContent}
                clearTerminal={clearTerminal}
                refreshFileSystem={refreshFileSystem}
                closeTerminal={closeTerminal}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Project Config Modal */}
      {showProjectConfig && (
        <ProjectConfigModal
          project={currentProject}
          onClose={() => setShowProjectConfig(false)}
          onSave={handleSaveProjectConfig}
        />
      )}
    </div>
  );
} 