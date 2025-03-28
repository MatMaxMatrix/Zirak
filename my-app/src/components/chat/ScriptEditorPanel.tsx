import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import EditorManager, { EditorFile } from './EditorManager';
import { getFileNameFromPath } from '@/utils/file-utils';

interface ScriptEditorPanelProps {
  initialScriptPath?: string;
  initialScriptContent?: string;
  filePath?: string;
  fileContent?: string;
  openFiles?: { path: string; content: string; hasUnsavedChanges: boolean }[];
  activeFilePath?: string;
  setFileContent?: (content: string) => void;
  saveFileContent?: () => void;
  cancelFileEditing?: () => void;
  fileEditorRef?: React.RefObject<any>;
  onOpenFile?: (path: string, content: string) => Promise<boolean>;
  onCloseFile?: (path: string) => void;
  onSwitchFile?: (path: string) => void;
  height?: string | number;
  width?: string | number;
  fetchScriptContent?: (path: string) => Promise<string | null>;
}

const ScriptEditorPanel: React.FC<ScriptEditorPanelProps> = ({
  initialScriptPath,
  initialScriptContent = '',
  filePath,
  fileContent = '',
  openFiles = [],
  activeFilePath = '',
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  fileEditorRef,
  onOpenFile,
  onCloseFile,
  onSwitchFile,
  height = '100%',
  width = '100%',
  fetchScriptContent
}) => {
  // Local state for handling files if not provided through props
  const [localFiles, setLocalFiles] = useState<EditorFile[]>([]);
  const [localActive, setLocalActive] = useState<string>('');
  
  // Editor reference if not provided
  const internalEditorRef = useRef<any>(null);
  
  // Debug counter to help trace file management
  const debugCounter = useRef(0);
  
  // Determine if we're using external file management or local
  const usingExternalFiles = Boolean(openFiles && openFiles.length > 0);
  
  console.log(`[ScriptEditorPanel] Render #${++debugCounter.current}`, {
    usingExternalFiles,
    openFilesCount: openFiles.length,
    activeFilePath,
    localFilesCount: localFiles.length,
    localActive
  });

  // Initialize files and active file for local state
  useEffect(() => {
    if (usingExternalFiles) return;
    
    // If we have a filePath and content, create a file
    if (filePath && fileContent !== undefined) {
      setLocalFiles(prev => {
        // Check if this file is already in our local files
        const existingFileIndex = prev.findIndex(file => file.path === filePath);
        
        if (existingFileIndex >= 0) {
          // Update existing file
          return prev.map((file, index) => 
            index === existingFileIndex 
              ? { ...file, content: fileContent, hasUnsavedChanges: false }
              : file
          );
        } else {
          // Add new file
          return [...prev, {
            path: filePath,
            content: fileContent,
            hasUnsavedChanges: false
          }];
        }
      });
      setLocalActive(filePath);
    }
    // Otherwise use initialScriptPath and content if provided as fallback
    else if (initialScriptPath && initialScriptContent !== undefined && localFiles.length === 0) {
      setLocalFiles([{
        path: initialScriptPath,
        content: initialScriptContent,
        hasUnsavedChanges: false
      }]);
      setLocalActive(initialScriptPath);
    }
  }, [initialScriptPath, initialScriptContent, filePath, fileContent, usingExternalFiles]);
  
  // Monitor external files changes
  useEffect(() => {
    if (!usingExternalFiles) return;
    
    console.log('[ScriptEditorPanel] External files updated:', {
      openFilesCount: openFiles.length,
      activeFilePath
    });
  }, [usingExternalFiles, openFiles, activeFilePath]);
  
  // Listen for file switch events
  useEffect(() => {
    const handleFileSwitchEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { path } = customEvent.detail || {};
      
      if (!path || typeof path !== 'string') return;
      
      console.log(`[ScriptEditorPanel] Received file-switch event for path: ${path}`);
      
      // Handle file switching based on whether we're using external files or local
      if (usingExternalFiles && path !== activeFilePath && onSwitchFile) {
        // For external file management, use the provided switch handler
        onSwitchFile(path);
      } else if (!usingExternalFiles && path !== localActive) {
        // For local file management, update local active
        const file = localFiles.find(f => f.path === path);
        if (file) {
          setLocalActive(path);
        }
      }
    };
    
    window.addEventListener('file-switch', handleFileSwitchEvent);
    
    return () => {
      window.removeEventListener('file-switch', handleFileSwitchEvent);
    };
  }, [usingExternalFiles, activeFilePath, localActive, localFiles, onSwitchFile]);
  
  // Handle opening a new file
  const handleOpenNewFile = useCallback(async (path: string): Promise<string | null> => {
    console.log('[ScriptEditorPanel] Opening new file:', path, {
      usingExternalFiles,
      externalFilesCount: openFiles.length,
      localFilesCount: localFiles.length
    });
    
    // If external file management is being used
    if (usingExternalFiles && onOpenFile && fetchScriptContent) {
      try {
        // Fetch the content
        const content = await fetchScriptContent(path);
        if (content === null) {
          toast.error(`Failed to load ${getFileNameFromPath(path)}`);
          return null;
        }
        
        // Notify the parent about the new file
        const success = await onOpenFile(path, content);
        console.log(`[ScriptEditorPanel] onOpenFile result for ${path}:`, success);
        
        if (!success) {
          toast.error(`Failed to open ${getFileNameFromPath(path)}`);
          return null;
        }
        
        return content;
      } catch (error) {
        console.error('Error opening file:', error);
        toast.error(`Failed to open ${getFileNameFromPath(path)}`);
        return null;
      }
    }
    
    // For local file management 
    if (!usingExternalFiles && fetchScriptContent) {
      try {
        const content = await fetchScriptContent(path);
        if (content !== null) {
          console.log(`[ScriptEditorPanel] Adding ${path} to local files`);
          
          // Add to local files
          setLocalFiles(prev => {
            // Check if file already exists
            const existingIndex = prev.findIndex(f => f.path === path);
            if (existingIndex >= 0) {
              // Update existing file
              return prev.map((f, i) => 
                i === existingIndex 
                  ? { ...f, content, hasUnsavedChanges: false }
                  : f
              );
            }
            // Add new file
            return [...prev, { 
              path, 
              content, 
              hasUnsavedChanges: false 
            }];
          });
          
          setLocalActive(path);
          return content;
        }
        
        toast.error(`Failed to load ${getFileNameFromPath(path)}`);
        return null;
      } catch (error) {
        console.error('Error opening file locally:', error);
        toast.error(`Failed to open ${getFileNameFromPath(path)}`);
        return null;
      }
    }
    
    // For demo/testing when fetchScriptContent is not available
    const demoContent = `// New file content for ${path}`;
    setLocalFiles(prev => [...prev, { 
      path, 
      content: demoContent, 
      hasUnsavedChanges: false 
    }]);
    setLocalActive(path);
    return demoContent;
  }, [usingExternalFiles, onOpenFile, fetchScriptContent]);
  
  // Handle switching files
  const handleSwitchFile = useCallback((path: string) => {
    console.log('[ScriptEditorPanel] Switching to file:', path, {
      usingExternalFiles,
      externalFilesCount: openFiles.length,
      activeExternalPath: activeFilePath,
      localFilesCount: localFiles.length,
      localActive
    });
    
    // Record unsaved changes and cursor position before switching files
    if (usingExternalFiles && fileEditorRef?.current) {
      try {
        // If we have an active file, save its current state
        if (activeFilePath) {
          const currentContent = fileEditorRef.current.getValue();
          const activeFile = openFiles.find(f => f.path === activeFilePath);
          
          // If content has changed, update our records
          if (activeFile && activeFile.content !== currentContent && setFileContent) {
            // Update file content but don't prompt for save
            setFileContent(currentContent);
          }
          
          // Save the view state and cursor position
          try {
            const editor = fileEditorRef.current;
            
            // Store view state on the model to preserve scroll position and selections
            const viewState = editor.saveViewState();
            if (viewState) {
              // The model will automatically restore this when we switch back
              // Monaco handles this internally as long as the model remains in memory
            }
            
            // Store cursor position explicitly to ensure it's preserved
            const position = editor.getPosition();
            if (position) {
              // The cursor position is also part of the view state, but we're being extra careful
              console.log(`[ScriptEditorPanel] Saved cursor position for ${activeFilePath}:`, position);
            }
          } catch (e) {
            console.error('[ScriptEditorPanel] Error saving editor state:', e);
          }
        }
      } catch (e) {
        console.error('[ScriptEditorPanel] Error saving file state before switch:', e);
      }
    }
    
    if (usingExternalFiles && onSwitchFile) {
      // Ensure we're properly highlighting the active tab by setting active path
      onSwitchFile(path);
      return;
    }
    
    // For local file management
    setLocalActive(path);
  }, [usingExternalFiles, onSwitchFile, openFiles, activeFilePath, localFiles.length, localActive, fileEditorRef, setFileContent]);
  
  // Handle content changes by updating the parent if using external files
  const handleContentChange = useCallback((path: string, content: string) => {
    if (usingExternalFiles && path === activeFilePath && setFileContent) {
      setFileContent(content);
      return;
    }
    
    // For local file management
    if (!usingExternalFiles) {
      setLocalFiles(prev => 
        prev.map(file => 
          file.path === path
            ? { ...file, content, hasUnsavedChanges: true }
            : file
        )
      );
    }
  }, [usingExternalFiles, activeFilePath, setFileContent]);

  // Convert openFiles to EditorFile format and ensure we're not losing any files
  const editorFiles: EditorFile[] = useMemo(() => {
    const files = usingExternalFiles ? openFiles.map(file => ({
      path: file.path,
      content: file.content,
      hasUnsavedChanges: file.hasUnsavedChanges
    })) : localFiles;
    
    console.log('[ScriptEditorPanel] Current editor files:', {
      count: files.length,
      paths: files.map(f => f.path),
      activeFile: usingExternalFiles ? activeFilePath : localActive
    });
    
    return files;
  }, [usingExternalFiles, openFiles, localFiles, activeFilePath, localActive]);

  // Handle saving a file
  const handleSaveFile = async (file: EditorFile) => {
    if (usingExternalFiles && saveFileContent) {
      // For external file management, we need to update the content first
      if (setFileContent) {
        setFileContent(file.content);
      }
      
      try {
        // Call the provided save function
        await saveFileContent();
        toast.success(`Saved ${getFileNameFromPath(file.path)}`);
        return;
      } catch (error) {
        console.error('Error saving file:', error);
        toast.error(`Failed to save ${getFileNameFromPath(file.path)}`);
        throw error;
      }
    } 
    
    // Otherwise, handle saving locally (only for demo/testing purposes)
    toast.success(`Saved ${getFileNameFromPath(file.path)}`);
    console.log('File saved (demo):', file.path);
    
    // Update local file state
    if (!usingExternalFiles) {
      setLocalFiles(prev => 
        prev.map(f => 
          f.path === file.path 
            ? { ...f, hasUnsavedChanges: false }
            : f
        )
      );
    }
  };

  // Handle closing a file
  const handleCloseFile = useCallback((file: EditorFile) => {
    console.log('[ScriptEditorPanel] Closing file:', file.path);
    
    if (usingExternalFiles && onCloseFile) {
      onCloseFile(file.path);
      return;
    }
    
    // Handle locally
    setLocalFiles(prev => {
      const filtered = prev.filter(f => f.path !== file.path);
      console.log('[ScriptEditorPanel] Files after close:', filtered.map(f => f.path));
      return filtered;
    });
    
    if (localActive === file.path && localFiles.length > 1) {
      // Set a new active file
      const newActive = localFiles.find(f => f.path !== file.path);
      if (newActive) {
        setLocalActive(newActive.path);
      }
    } else if (localFiles.length <= 1) {
      // Last file being closed
      setLocalActive('');
      if (cancelFileEditing) {
        cancelFileEditing();
      }
    }
  }, [localActive, localFiles.length, cancelFileEditing, onCloseFile, usingExternalFiles]);

  // Keep editor focused when active file changes
  useEffect(() => {
    // Only proceed if we have an active file to focus on
    if (!(usingExternalFiles ? activeFilePath : localActive)) return;
    
    // Ensure editor is focused after file switching
    const ensureFocus = () => {
      if (fileEditorRef?.current) {
        try {
          // Focus the editor
          fileEditorRef.current.focus();
          
          // Make cursor visible
          const position = fileEditorRef.current.getPosition();
          if (position) {
            fileEditorRef.current.revealPositionInCenter(position);
            // Simulate typing to make cursor visible
            fileEditorRef.current.trigger('keyboard', 'type', { text: '' });
          }
        } catch (e) {
          console.error('[ScriptEditorPanel] Error focusing editor:', e);
        }
      }
    };
    
    // Use requestAnimationFrame for more reliable timing
    requestAnimationFrame(() => {
      // Delay slightly to ensure component has fully updated
      setTimeout(ensureFocus, 50);
    });
    
  }, [usingExternalFiles ? activeFilePath : localActive, fileEditorRef]);

  return (
    <div style={{ height, width }}>
      <EditorManager
        initialFiles={editorFiles}
        activeFilePath={usingExternalFiles ? activeFilePath : localActive}
        onFileSave={handleSaveFile}
        onFileClose={handleCloseFile}
        onOpenNewFile={handleOpenNewFile}
        onContentChange={handleContentChange}
        onSwitchFile={handleSwitchFile}
        editorRef={fileEditorRef || internalEditorRef}
        height={height}
        width={width}
      />
    </div>
  );
};

export default ScriptEditorPanel; 