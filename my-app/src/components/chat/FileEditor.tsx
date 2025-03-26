import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MonacoEditorComponent from './MonacoEditorComponent';
import { getLanguageFromFilePath } from '@/utils/languages';
import { getFileNameFromPath } from '@/utils/file-utils';
import { useWindowSize } from '@/hooks/useWindowSize';
import useKeyboardShortcut from '@/hooks/useKeyboardShortcut';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import * as monaco from 'monaco-editor';

// Import the monaco config to ensure it's loaded before any editor components
import '../../utils/monaco-config';

interface FileEditorProps {
  fileContent: string;
  setFileContent: (content: string) => void;
  saveFileContent: () => void;
  cancelFileEditing: () => void;
  filePath: string;
  fileEditorRef?: React.RefObject<any>;
  openFiles?: any[];
  activeFilePath?: string;
  onOpenFile?: (path: string, content: string) => Promise<boolean>;
  onCloseFile?: (path: string) => void;
  onSwitchFile?: (path: string) => void;
}

interface OpenedFile {
  path: string;
  content: string;
  hasUnsavedChanges?: boolean;
  model?: monaco.editor.ITextModel;
  viewState?: monaco.editor.ICodeEditorViewState;
}

const FileEditor: React.FC<FileEditorProps> = ({
  fileContent,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  filePath,
  fileEditorRef,
  openFiles = [],
  activeFilePath = '',
  onOpenFile,
  onCloseFile,
  onSwitchFile
}) => {
  const [editorHeight, setEditorHeight] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState(fileContent);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'close' | 'switch', path?: string} | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const windowSize = useWindowSize();
  const isMultipleFilesOpen = openFiles && openFiles.length > 1;
  
  // Use path for tab key if activeFilePath not provided
  const currentPath = activeFilePath || filePath;
  
  // Reference to Monaco editor instance
  const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Map to store models for each file
  const [fileModelsMap, setFileModelsMap] = useState<Record<string, {
    model: monaco.editor.ITextModel | null;
    viewState: monaco.editor.ICodeEditorViewState | null;
  }>>({});
  
  // Track if file has unsaved changes
  const hasUnsavedChanges = fileContent !== originalContent;

  // Store original content when file first loads
  useEffect(() => {
    setOriginalContent(fileContent);
  }, [currentPath]);
  
  // Get filename from path
  const getFileName = (path: string) => {
    return getFileNameFromPath(path);
  };
  
  // Get language from file extension
  const getLanguage = (path: string) => {
    return getLanguageFromFilePath(path);
  };
  
  // Get language for current file
  const language = getLanguage(currentPath);
  
  // Handle editor mount to store the Monaco instance
  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: any) => {
    monacoInstanceRef.current = editor;
    
    // If fileEditorRef is provided, update it
    if (fileEditorRef) {
      // Use a type assertion to make TypeScript happy
      (fileEditorRef as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor>).current = editor;
    }
    
    // Create or update model for the current file if it doesn't exist
    if (!fileModelsMap[currentPath]) {
      const model = createOrGetModel(currentPath, fileContent, monacoInstance);
      // Set the model for the current editor
      if (model) {
        editor.setModel(model);
      }
    } else if (fileModelsMap[currentPath].model) {
      // If model exists, set it
      editor.setModel(fileModelsMap[currentPath].model);
      
      // Restore view state if exists
      if (fileModelsMap[currentPath].viewState) {
        editor.restoreViewState(fileModelsMap[currentPath].viewState);
      }
    }
  };
  
  // Function to create or get model for a file
  const createOrGetModel = (path: string, content: string, monacoInstance: any): monaco.editor.ITextModel | null => {
    // Check if model already exists in Monaco's model registry
    const existingModels = monaco.editor.getModels();
    const existingModel = existingModels.find(model => model.uri.toString() === monaco.Uri.file(path).toString());
    
    if (existingModel) {
      // Update existing model content if it's different
      if (existingModel.getValue() !== content) {
        existingModel.setValue(content);
      }
      return existingModel;
    }
    
    // Create a new model
    try {
      const uri = monaco.Uri.file(path);
      const language = getLanguage(path);
      const model = monaco.editor.createModel(content, language, uri);
      
      // Update the models map
      setFileModelsMap(prev => ({
        ...prev,
        [path]: {
          model,
          viewState: null
        }
      }));
      
      return model;
    } catch (error) {
      console.error('Error creating model:', error);
      return null;
    }
  };
  
  // Handle editor errors
  const handleEditorError = (error: Error) => {
    console.error('Monaco editor error:', error);
    setEditorError('An error occurred in the editor. Try reloading the page.');
    
    // Attempt to recover from "V is not iterable" error
    if (error.message?.includes('V is not iterable')) {
      console.warn('Detected "V is not iterable" error, attempting recovery...');
      
      // Wait a moment and try to reset the editor content
      setTimeout(() => {
        try {
          if (monacoInstanceRef.current) {
            const model = monacoInstanceRef.current.getModel();
            if (model) {
              // Try setting empty content first
              model.setValue('');
              
              // Then after a brief delay, set the actual content
              setTimeout(() => {
                try {
                  model.setValue(fileContent || '');
                  setEditorError(null);
                } catch (innerError) {
                  console.error('Recovery attempt failed:', innerError);
                }
              }, 50);
            }
          }
        } catch (recoveryError) {
          console.error('Error during recovery attempt:', recoveryError);
        }
      }, 100);
    }
  };
  
  // Update editor height on window resize
  useEffect(() => {
    if (windowSize.height) {
      const idealHeight = windowSize.height * 0.6;
      const minHeight = 300;
      const maxHeight = windowSize.height * 0.8;
      setEditorHeight(Math.min(Math.max(idealHeight, minHeight), maxHeight));
    }
  }, [windowSize]);
  
  // Save file handler - also updates the original content to mark file as saved
  const handleSaveFile = () => {
    saveFileContent();
    setOriginalContent(fileContent);
  };
  
  // Keyboard shortcut for saving
  useKeyboardShortcut(['Meta', 's'], (e: KeyboardEvent) => {
    e.preventDefault();
    handleSaveFile();
  });
  
  // Handle editor resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const editorContainer = document.getElementById('editor-container');
      if (editorContainer) {
        const containerRect = editorContainer.getBoundingClientRect();
        const newHeight = Math.max(200, e.clientY - containerRect.top);
        setEditorHeight(newHeight);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  // Check for unsaved changes before closing or switching
  const checkUnsavedChanges = (actionType: 'close' | 'switch', path?: string) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: actionType, path });
      setShowUnsavedDialog(true);
      return false;
    }
    return true;
  };
  
  // Proceed with the pending action after handling unsaved changes
  const proceedWithPendingAction = () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'close' && onCloseFile) {
      // Save the view state before closing
      saveCurrentViewState();
      onCloseFile(currentPath);
    } else if (pendingAction.type === 'switch' && onSwitchFile && pendingAction.path) {
      // Save the view state before switching
      saveCurrentViewState();
      onSwitchFile(pendingAction.path);
    } else if (pendingAction.type === 'close') {
      cancelFileEditing();
    }
    
    setShowUnsavedDialog(false);
    setPendingAction(null);
  };
  
  // Save the current editor's view state
  const saveCurrentViewState = () => {
    if (monacoInstanceRef.current && currentPath) {
      const viewState = monacoInstanceRef.current.saveViewState();
      const model = monacoInstanceRef.current.getModel();
      
      // Update the model map with the current view state
      setFileModelsMap(prev => ({
        ...prev,
        [currentPath]: {
          model: model,
          viewState
        }
      }));
    }
  };
  
  // Handle file tab selection with unsaved changes check
  const handleTabSelect = (path: string) => {
    if (path === currentPath) return;
    
    // Save the current file's view state before switching
    saveCurrentViewState();
    
    if (checkUnsavedChanges('switch', path) && onSwitchFile) {
      onSwitchFile(path);
    }
  };
  
  // Handle file tab close with unsaved changes check
  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    
    if (path === currentPath) {
      if (checkUnsavedChanges('close') && onCloseFile) {
        onCloseFile(path);
      }
    } else if (onCloseFile) {
      onCloseFile(path);
    }
  };
  
  // Handle cancel editing with unsaved changes check
  const handleCancelEditing = () => {
    if (checkUnsavedChanges('close')) {
      cancelFileEditing();
    }
  };
  
  // Ensure window beforeunload event captures unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Standard message (browsers will show their own message)
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Update parent component about unsaved changes status
  useEffect(() => {
    // If the current file is in the openFiles array, we should update its hasUnsavedChanges flag
    if (openFiles && currentPath) {
      const fileIndex = openFiles.findIndex(file => file.path === currentPath);
      if (fileIndex >= 0 && openFiles[fileIndex].hasUnsavedChanges !== hasUnsavedChanges) {
        // Create an updated file object with the hasUnsavedChanges flag
        const updatedFile = { ...openFiles[fileIndex], hasUnsavedChanges };
        
        // Use a callback approach to ensure we're working with the latest state
        // This isn't directly updating the parent's state, just informing it
        if (onOpenFile) {
          // This is a bit of a hack, using onOpenFile to update the file's metadata
          // Ideally we would have a separate callback for updating file metadata
          onOpenFile(updatedFile.path, updatedFile.content)
            .then(() => {
              // Handle success if needed
            })
            .catch(err => {
              console.error('Failed to update file metadata:', err);
            });
        }
      }
    }
  }, [hasUnsavedChanges, currentPath, openFiles, onOpenFile]);
  
  // Clean up models when unmounting
  useEffect(() => {
    return () => {
      // Dispose all models created by this component
      Object.entries(fileModelsMap).forEach(([path, { model }]) => {
        if (model && !model.isDisposed()) {
          model.dispose();
        }
      });
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center bg-[#1F1F1F] border-b border-[#2A2A2A] px-3 py-2">
        <div className="text-sm text-gray-300">
          Editing: <span className="font-medium">{getFileName(currentPath)}</span>
          {hasUnsavedChanges && <span className="text-blue-400 ml-2">•</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveFile}
            className={`px-3 py-1 h-8 text-sm flex items-center gap-1 ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-500' : ''}`}
          >
            <Save size={14} /> Save {hasUnsavedChanges ? '(⌘S)' : ''}
          </Button>
          </div>
      </div>

      {isMultipleFilesOpen && (
        <div className="flex bg-[#1A1A1A] overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
          {openFiles.map((file: OpenedFile) => (
            <div
              key={file.path}
              className={`flex items-center min-w-0 max-w-[200px] px-3 py-1 text-xs border-r border-[#2A2A2A] cursor-pointer ${
                file.path === currentPath
                  ? 'bg-[#2A2A2A] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => handleTabSelect(file.path)}
            >
              <div className="truncate">
                {getFileName(file.path)}
                {(file.path === currentPath ? hasUnsavedChanges : file.hasUnsavedChanges) && <span className="text-blue-400 ml-1">•</span>}
              </div>
              <button
                className="ml-2 text-gray-500 hover:text-gray-300"
                onClick={(e) => handleTabClose(e, file.path)}
              >
                <X size={12} />
              </button>
          </div>
          ))}
        </div>
      )}

      <div
        id="editor-container"
        className="flex-1 overflow-hidden bg-[#1E1E1E] relative"
        style={{ height: `${editorHeight}px` }}
      >
        {editorError && (
          <div className="absolute inset-0 z-10 bg-red-900/20 flex items-center justify-center text-red-300 p-4">
            <div className="bg-[#1A1A1A] p-4 rounded-md border border-red-800 max-w-md">
              <p className="mb-2">{editorError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </div>
        )}
        
        <MonacoEditorComponent
          content={fileContent}
          onChange={setFileContent}
          language={language}
          path={currentPath}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            guides: { indentation: true },
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
          }}
          editorRef={fileEditorRef}
          onError={handleEditorError}
          onSave={handleSaveFile}
          onMount={handleEditorMount}
        />
        
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 left-0 right-0 h-1 bg-transparent cursor-ns-resize hover:bg-blue-500"
          onMouseDown={handleResizeStart}
        />
      </div>
      
      <div className="flex items-center justify-between p-2 bg-[#1A1A1A] border-t border-[#2A2A2A]">
        <div className="text-xs text-gray-400">
          {currentPath}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEditing}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveFile}
            className={`flex items-center gap-1 ${hasUnsavedChanges ? 'text-blue-400 hover:text-blue-300' : 'text-gray-400 hover:text-white'}`}
          >
            <Save size={14} /> Save
          </Button>
        </div>
      </div>
      
      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes in {getFileName(currentPath)}. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={() => {
              setShowUnsavedDialog(false);
              proceedWithPendingAction();
            }}>
              Discard Changes
            </Button>
            <Button onClick={() => {
              handleSaveFile();
              setShowUnsavedDialog(false);
              proceedWithPendingAction();
            }}>
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileEditor;