import React, { useState, useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { X, Save, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MonacoEditorComponent from './MonacoEditorComponent';
import { getLanguageFromFilePath } from '@/utils/languages';
import { getFileNameFromPath } from '@/utils/file-utils';

export interface EditorFile {
  path: string;
  content: string;
  hasUnsavedChanges: boolean;
  model?: monaco.editor.ITextModel;
  viewState?: monaco.editor.ICodeEditorViewState;
}

interface EditorManagerProps {
  initialFiles?: EditorFile[];
  activeFilePath?: string;
  onFileSave?: (file: EditorFile) => Promise<void>;
  onFileClose?: (file: EditorFile) => void;
  onSwitchFile?: (path: string) => void;
  onContentChange?: (path: string, content: string) => void;
  height?: string | number;
  width?: string | number;
  onOpenNewFile?: (path: string) => Promise<string | null>;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor>;
}

const EditorManager: React.FC<EditorManagerProps> = ({
  initialFiles = [],
  activeFilePath: externalActivePath,
  onFileSave,
  onFileClose,
  onSwitchFile: externalSwitchFile,
  onContentChange,
  height = '100%',
  width = '100%',
  onOpenNewFile,
  editorRef: externalEditorRef
}) => {
  // State for files
  const [files, setFiles] = useState<EditorFile[]>(initialFiles);
  const [activeFilePath, setActiveFilePath] = useState<string>(
    externalActivePath || (initialFiles.length > 0 ? initialFiles[0].path : '')
  );
  
  // Editor reference
  const internalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Use external ref if provided, otherwise use internal
  const editorRef = externalEditorRef || internalEditorRef;
  
  // Models registry to keep track of all file models
  const modelsRegistry = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  
  // View states registry
  const viewStatesRegistry = useRef<Map<string, monaco.editor.ICodeEditorViewState | null>>(new Map());
  
  // Dialog state for unsaved changes
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'close' | 'switch';
    path?: string;
  } | null>(null);

  // Active file
  const activeFile = files.find(file => file.path === activeFilePath);

  // Update files when initialFiles change
  useEffect(() => {
    if (initialFiles.length === 0) return;
    
    console.log('[EditorManager] Updating files from initialFiles:', initialFiles.map(f => f.path));
    
    // We need to merge the incoming files with existing files to avoid losing file state
    setFiles(prevFiles => {
      // Create a map of existing files by path for easy lookup
      const existingFilesMap = new Map(prevFiles.map(f => [f.path, f]));
      
      // Process initialFiles, keeping any existing file state where possible
      const newFiles = initialFiles.map(newFile => {
        const existingFile = existingFilesMap.get(newFile.path);
        
        if (existingFile) {
          // Keep existing view state and model if present
          return {
            ...newFile,
            model: existingFile.model || newFile.model,
            viewState: existingFile.viewState || newFile.viewState
          };
        }
        
        return newFile;
      });
      
      return newFiles;
    });
  }, [initialFiles]);
  
  // Update active file when external path changes
  useEffect(() => {
    if (!externalActivePath) return;
    
    console.log('[EditorManager] Updating active file to:', externalActivePath);
    
    // Check if this is a file we have in our files state
    const fileExists = files.some(f => f.path === externalActivePath);
    
    if (fileExists && externalActivePath !== activeFilePath) {
      setActiveFilePath(externalActivePath);
      
      // If editor is ready, we need to update model
      if (editorRef.current) {
        // Save view state of current file
        saveViewState();
        
        // Setup model for new active file
        const file = files.find(f => f.path === externalActivePath);
        if (file) {
          const model = getOrCreateModel(file);
          editorRef.current.setModel(model);
          
          // Restore view state if available
          const viewState = viewStatesRegistry.current.get(externalActivePath);
          if (viewState) {
            editorRef.current.restoreViewState(viewState);
          }
        }
      }
    }
  }, [externalActivePath, files]);

  // Get or create a model for a file
  const getOrCreateModel = (file: EditorFile): monaco.editor.ITextModel => {
    // Check if we already have a model for this file
    if (modelsRegistry.current.has(file.path)) {
      return modelsRegistry.current.get(file.path)!;
    }
    
    // Create a new model
    const uri = monaco.Uri.file(file.path);
    const language = getLanguageFromFilePath(file.path);
    const model = monaco.editor.createModel(file.content, language, uri);
    
    // Store in registry
    modelsRegistry.current.set(file.path, model);
    
    return model;
  };

  // Handle editor mounting
  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Store editor instance in our internal ref
    internalEditorRef.current = editor;
    
    // If using external ref, update it too
    if (externalEditorRef && !externalEditorRef.current) {
      // Use type assertion for compatibility
      (externalEditorRef as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor>).current = editor;
    }
    
    // If we have an active file, set its model
    if (activeFile) {
      const model = getOrCreateModel(activeFile);
      editor.setModel(model);
      
      // Restore view state if we have one
      const viewState = viewStatesRegistry.current.get(activeFile.path);
      if (viewState) {
        editor.restoreViewState(viewState);
      }
      
      // Focus the editor
      editor.focus();
    }
  };

  // Handle file content change
  const handleContentChange = (path: string, newContent: string) => {
    // Update internal state
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.path === path
          ? { 
              ...file, 
              content: newContent, 
              hasUnsavedChanges: true 
            }
          : file
      )
    );
    
    // Notify parent component if callback provided
    if (onContentChange) {
      onContentChange(path, newContent);
    }
  };

  // Save the current file
  const saveCurrentFile = async () => {
    if (!activeFile) return;
    
    try {
      if (onFileSave) {
        await onFileSave(activeFile);
      }
      
      // Mark as saved
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.path === activeFile.path
            ? { ...file, hasUnsavedChanges: false }
            : file
        )
      );
    } catch (error) {
      console.error('Error saving file:', error);
      // Could show an error toast here
    }
  };

  // Save view state before switching
  const saveViewState = () => {
    if (!editorRef.current || !activeFile) return;
    
    // Save the current view state
    const viewState = editorRef.current.saveViewState();
    viewStatesRegistry.current.set(activeFile.path, viewState);
  };

  // Handle switching files
  const switchToFile = (path: string) => {
    // Don't switch if it's the same file
    if (path === activeFilePath) return;
    
    console.log(`[EditorManager] Switching from ${activeFilePath} to ${path}`);
    
    // Save the current view state
    saveViewState();
    
    // Check if the current file has unsaved changes
    if (activeFile?.hasUnsavedChanges) {
      setPendingAction({ type: 'switch', path });
      setShowUnsavedDialog(true);
      return;
    }
    
    // Actually switch
    performSwitch(path);
  };

  // Perform the actual switch
  const performSwitch = (path: string) => {
    console.log(`[EditorManager] Performing switch to ${path}`);
    
    // Set the active file path immediately for UI responsiveness
    setActiveFilePath(path);
    
    // If editor is ready, update model
    if (editorRef.current) {
      const file = files.find(f => f.path === path);
      if (file) {
        try {
          const model = getOrCreateModel(file);
          editorRef.current.setModel(model);
          
          // Restore view state if we have one
          const viewState = viewStatesRegistry.current.get(path);
          if (viewState) {
            editorRef.current.restoreViewState(viewState);
          }
          
          // Focus the editor after switching
          editorRef.current.focus();
          
          // Force a layout update to ensure editor renders correctly
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.layout();
              // Scroll to ensure the cursor is visible
              editorRef.current.revealPositionInCenter({
                lineNumber: editorRef.current.getPosition()?.lineNumber || 1,
                column: editorRef.current.getPosition()?.column || 1
              });
            }
          }, 10);
        } catch (error) {
          console.error('Error switching to file:', error);
        }
      }
    }
    
    // Call external switch handler if provided
    if (externalSwitchFile) {
      externalSwitchFile(path);
    }
  };

  // Handle closing a file
  const closeFile = (path: string) => {
    // Check if it's the active file and has unsaved changes
    const file = files.find(f => f.path === path);
    if (!file) return;
    
    if (path === activeFilePath && file.hasUnsavedChanges) {
      setPendingAction({ type: 'close', path });
      setShowUnsavedDialog(true);
      return;
    }
    
    // Otherwise close immediately
    performClose(path);
  };

  // Perform the actual close
  const performClose = (path: string) => {
    // If it's the active file, switch to another file
    if (path === activeFilePath) {
      const remainingFiles = files.filter(f => f.path !== path);
      
      if (remainingFiles.length > 0) {
        // Save view state before switching
        saveViewState();
        
        // Switch to the next file
        const nextFile = remainingFiles[0];
        setActiveFilePath(nextFile.path);
        
        // Update editor model
        if (editorRef.current) {
          const model = getOrCreateModel(nextFile);
          editorRef.current.setModel(model);
          
          // Restore view state
          const viewState = viewStatesRegistry.current.get(nextFile.path);
          if (viewState) {
            editorRef.current.restoreViewState(viewState);
          }
        }
      } else {
        // No more files, clear the editor
        if (editorRef.current) {
          editorRef.current.setModel(null);
        }
        setActiveFilePath('');
      }
    }
    
    // Remove the file from our state
    setFiles(prevFiles => prevFiles.filter(f => f.path !== path));
    
    // Clean up model and view state
    if (modelsRegistry.current.has(path)) {
      const model = modelsRegistry.current.get(path)!;
      if (model && !model.isDisposed()) {
        model.dispose();
      }
      modelsRegistry.current.delete(path);
    }
    
    viewStatesRegistry.current.delete(path);
    
    // Call onFileClose prop if provided
    if (onFileClose) {
      const file = files.find(f => f.path === path);
      if (file) {
        onFileClose(file);
      }
    }
  };

  // Handle dialog confirmations
  const handleDialogAction = (action: 'save' | 'discard' | 'cancel') => {
    if (!pendingAction) {
      setShowUnsavedDialog(false);
      return;
    }
    
    const { type, path } = pendingAction;
    
    if (action === 'cancel') {
      setShowUnsavedDialog(false);
      setPendingAction(null);
      return;
    }
    
    if (action === 'save') {
      // Save current file
      saveCurrentFile().then(() => {
        // After saving, perform the pending action
        if (type === 'switch' && path) {
          performSwitch(path);
        } else if (type === 'close' && path) {
          performClose(path);
        }
        
        setShowUnsavedDialog(false);
        setPendingAction(null);
      }).catch(error => {
        console.error('Error saving file before action:', error);
        setShowUnsavedDialog(false);
        setPendingAction(null);
      });
      
      return;
    }
    
    if (action === 'discard') {
      // Discard changes and perform action
      if (type === 'switch' && path) {
        performSwitch(path);
      } else if (type === 'close' && path) {
        performClose(path);
      }
      
      setShowUnsavedDialog(false);
      setPendingAction(null);
    }
  };

  // Open a new file
  const openFile = async (path: string) => {
    // Check if file is already open
    const fileExists = files.some(f => f.path === path);
    if (fileExists) {
      // Just switch to it
      switchToFile(path);
      return;
    }
    
    // Load file content
    if (onOpenNewFile) {
      try {
        const content = await onOpenNewFile(path);
        if (content !== null) {
          // Add to files
          const newFile: EditorFile = {
            path,
            content: content || '',
            hasUnsavedChanges: false
          };
          
          setFiles(prevFiles => [...prevFiles, newFile]);
          
          // Switch to it
          switchToFile(path);
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  };

  // Clean up models on unmount
  useEffect(() => {
    return () => {
      // Dispose all models
      modelsRegistry.current.forEach(model => {
        if (model && !model.isDisposed()) {
          model.dispose();
        }
      });
      
      // Clear registries
      modelsRegistry.current.clear();
      viewStatesRegistry.current.clear();
    };
  }, []);

  // Add keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S or Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentFile();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFile]);

  // Show warning when closing window with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = files.some(file => file.hasUnsavedChanges);
      
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [files]);

  // Listen for file switch events from outside the component
  useEffect(() => {
    const handleFileSwitchEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { path } = customEvent.detail || {};
      
      if (path && typeof path === 'string') {
        console.log(`[EditorManager] Received file-switch event for path: ${path}`);
        // Check if this file is in our files list
        const fileExists = files.some(f => f.path === path);
        if (fileExists && path !== activeFilePath) {
          switchToFile(path);
        }
      }
    };
    
    window.addEventListener('file-switch', handleFileSwitchEvent);
    
    return () => {
      window.removeEventListener('file-switch', handleFileSwitchEvent);
    };
  }, [files, activeFilePath]);

  return (
    <div className="flex flex-col h-full" style={{ width, height }}>
      {/* Header with tabs */}
      <div className="flex flex-col border-b border-[#2A2A2A]">
        {/* Tabs */}
        <div className="flex overflow-x-auto bg-[#1A1A1A] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
          {files.map(file => {
            const isActive = file.path === activeFilePath;
            const fileName = getFileNameFromPath(file.path);
            
            return (
              <div
                key={file.path}
                className={`flex items-center min-w-0 max-w-[200px] px-3 py-1.5 text-xs border-r border-[#2A2A2A] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#2A2A2A] text-white border-t-2 border-t-blue-500 font-medium'
                    : 'text-gray-400 hover:text-gray-200 border-t-2 border-t-transparent hover:bg-[#222222]'
                }`}
                onClick={() => switchToFile(file.path)}
                onDoubleClick={() => {
                  if (editorRef.current) {
                    // Force focus on double-click
                    editorRef.current.focus();
                  }
                }}
                title={file.path}
              >
                <div className="truncate flex items-center">
                  {fileName}
                  {file.hasUnsavedChanges && (
                    <CircleDot size={8} className={`ml-2 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                  )}
                </div>
                <button
                  className="ml-2 text-gray-500 hover:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.path);
                  }}
                  title={`Close ${fileName}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        
        {/* Active file info */}
        {activeFile && (
          <div className="flex justify-between items-center bg-[#1F1F1F] px-3 py-2">
            <div className="text-sm text-gray-300">
              {getFileNameFromPath(activeFile.path)}
              {activeFile.hasUnsavedChanges && (
                <span className="text-blue-400 ml-2">•</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentFile}
              className={`px-3 py-1 h-8 text-sm flex items-center gap-1 ${
                activeFile.hasUnsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500'
                  : ''
              }`}
            >
              <Save size={14} /> Save {activeFile.hasUnsavedChanges ? '(⌘S)' : ''}
            </Button>
          </div>
        )}
      </div>
      
      {/* Editor area */}
      <div className="flex-1 overflow-hidden bg-[#1E1E1E]">
        {activeFile ? (
          <MonacoEditorComponent
            path={activeFile.path}
            content={activeFile.content}
            language={getLanguageFromFilePath(activeFile.path)}
            onChange={(value) => handleContentChange(activeFile.path, value)}
            onSave={saveCurrentFile}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            No file open
          </div>
        )}
      </div>
      
      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p>
            {activeFile && `You have unsaved changes in ${getFileNameFromPath(activeFile.path)}.`}
            What would you like to do?
          </p>
          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => handleDialogAction('cancel')}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={() => handleDialogAction('discard')}>
              Discard Changes
            </Button>
            <Button onClick={() => handleDialogAction('save')}>
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorManager; 