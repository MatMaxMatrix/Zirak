import { useState, useEffect, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { OpenedFile } from './types';
import { EditorModelManager, modelManager as globalModelManager } from './EditorModelManager';
import { setupFileEventListeners } from './EditorEventListeners';
import { preventCanceledErrors } from './EditorCleanup';
import { getLanguageFromFilePath } from '@/utils/languages';
import { handleFileTabSwitch, handleContentChange, handleCloseTab } from './EditorEventHandlers';

/**
 * Custom hook for managing file editor state
 */
export const useFileEditor = (initialFilePath: string = '') => {
  // File state management
  const [openedFiles, setOpenedFiles] = useState<OpenedFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>(initialFilePath);
  const [fileContent, setFileContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Editor state management
  const [editorHeight, setEditorHeight] = useState<number>(500);
  const [resizing, setResizing] = useState<boolean>(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelManager = useRef<EditorModelManager>(globalModelManager);

  // Ensure model manager is initialized
  useEffect(() => {    
    return () => {
      // Cleanup on unmount
      if (modelManager.current) {
        modelManager.current.dispose();
      }
      
      // Prevent "Canceled" errors during cleanup
      preventCanceledErrors();
    };
  }, []);

  /**
   * Get file extension from path
   */
  const getFileExtension = useCallback((path: string): string => {
    const extension = path.split('.').pop() || '';
    return extension.toLowerCase();
  }, []);

  /**
   * Get Monaco language ID based on file extension
   */
  const getLanguageForPath = useCallback((path: string): string => {
    return getLanguageFromFilePath(path);
  }, []);

  /**
   * Fetch file content from backend
   */
  const fetchFileContent = useCallback(async (path: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.content || '';
    } catch (error) {
      console.error('Error fetching file content:', error);
      return null;
    }
  }, []);

  /**
   * Save file content to backend
   */
  const saveFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    }
  }, []);

  /**
   * Handle save action
   */
  const handleSave = useCallback(async () => {
    if (!activeFilePath || !hasUnsavedChanges) return;
    
    try {
      // Get current content from editor or state
      const contentToSave = editorRef.current 
        ? editorRef.current.getValue() 
        : fileContent;
      
      // Update model content
      modelManager.current.updateTabContent(activeFilePath, contentToSave);
      
      // Implement your save logic here
      console.log('Saving file:', activeFilePath, contentToSave);
      
      // Update file state
      setOpenedFiles(prev => 
        prev.map(file => 
          file.path === activeFilePath 
            ? { ...file, content: contentToSave, hasUnsavedChanges: false } 
            : file
        )
      );
      
      // Clear unsaved flag
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  }, [activeFilePath, fileContent, hasUnsavedChanges]);

  /**
   * Handle content change from editor
   */
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeFilePath) return;
    
    // Update the file content state
    setFileContent(newContent);
    
    // Check if content is different from saved content
    const openedFile = openedFiles.find(file => file.path === activeFilePath);
    const contentChanged = openedFile && openedFile.content !== newContent;
    
    if (contentChanged && !hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      
      // Update opened files state
      setOpenedFiles(prev => 
        prev.map(file => 
          file.path === activeFilePath
            ? { ...file, hasUnsavedChanges: true }
            : file
        )
      );
    }
  }, [activeFilePath, openedFiles, hasUnsavedChanges]);

  /**
   * Handle file tab click to switch between files
   */
  const handleFileTabSwitch = useCallback((path: string) => {
    if (path === activeFilePath) return;
    
    // Save current file's state
    if (activeFilePath && editorRef.current) {
      const currentViewState = editorRef.current.saveViewState();
      
      // Update current file content from editor before switching
      const currentContent = editorRef.current.getValue();
      
      // Save to model manager
      modelManager.current.saveTabViewState(
        activeFilePath, 
        currentViewState, 
        { scrollTop: 0, scrollLeft: 0 }, // Default scroll position
        currentContent
      );
    }
    
    // Get target file
    const targetFile = openedFiles.find(file => file.path === path);
    if (!targetFile) return;
    
    // Update state
    setActiveFilePath(path);
    setFileContent(targetFile.content);
    setHasUnsavedChanges(targetFile.hasUnsavedChanges || false);
    
    // The model will be applied when the editor re-renders with the new path
  }, [activeFilePath, openedFiles]);

  /**
   * Handle tab close
   */
  const handleCloseTab = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Find the file to close
    const fileToClose = openedFiles.find(file => file.path === path);
    if (!fileToClose) return;
    
    // Find the next file to switch to
    let nextFilePath = '';
    const fileIndex = openedFiles.findIndex(file => file.path === path);
    
    if (openedFiles.length > 1) {
      if (fileIndex > 0) {
        // Switch to previous file
        nextFilePath = openedFiles[fileIndex - 1].path;
      } else {
        // Switch to next file
        nextFilePath = openedFiles[1].path;
      }
    }
    
    // Dispose of the model if this is the active file
    if (path === activeFilePath && modelManager.current) {
      modelManager.current.disposeTabModel(path);
    }
    
    // Remove from opened files
    setOpenedFiles(prev => prev.filter(file => file.path !== path));
    
    // Switch to next file if necessary
    if (path === activeFilePath && nextFilePath) {
      handleFileTabSwitch(nextFilePath);
    } else if (path === activeFilePath) {
      // No other files, clear everything
      setActiveFilePath('');
      setFileContent('');
      setHasUnsavedChanges(false);
    }
  }, [openedFiles, activeFilePath, handleFileTabSwitch]);

  /**
   * Initialize editor
   */
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set initial model for current file
    if (activeFilePath && modelManager.current) {
      // Create or get model for current file
      const tabData = modelManager.current.getTabModel(
        activeFilePath,
        fileContent,
        getLanguageForPath(activeFilePath)
      );
      
      if (tabData.model) {
        // Apply model to editor
        editor.setModel(tabData.model);
        
        // Restore view state if available
        if (tabData.viewState) {
          editor.restoreViewState(tabData.viewState);
        }
        
        // Restore scroll position if available
        if (tabData.scroll) {
          editor.setScrollTop(tabData.scroll.scrollTop);
          editor.setScrollLeft(tabData.scroll.scrollLeft);
        }
        
        // Focus editor
        editor.focus();
      }
    }
    
    // Set up keyboard shortcut for save
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        handleSave();
      }
    );
  }, [activeFilePath, fileContent, getLanguageForPath, handleSave]);

  /**
   * Apply current file's model to editor when active file changes
   */
  useEffect(() => {
    if (!editorRef.current || !activeFilePath || !modelManager.current) return;
    
    const tabData = modelManager.current.getTabModel(
      activeFilePath,
      fileContent,
      getLanguageForPath(activeFilePath)
    );
    
    if (tabData.model) {
      // Apply model to editor
      editorRef.current.setModel(tabData.model);
      
      // Restore view state if available
      if (tabData.viewState) {
        editorRef.current.restoreViewState(tabData.viewState);
      }
      
      // Restore scroll position if available
      if (tabData.scroll) {
        editorRef.current.setScrollTop(tabData.scroll.scrollTop);
        editorRef.current.setScrollLeft(tabData.scroll.scrollLeft);
      }
      
      // Focus editor
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [activeFilePath, fileContent, getLanguageForPath]);

  /**
   * Set up file system event listeners
   */
  useEffect(() => {
    const cleanup = setupFileEventListeners({
      openedFiles,
      activeFilePath,
      fileContent,
      setFileContent,
      setOpenedFiles,
      setActiveFilePath,
      setHasUnsavedChanges,
      fetchFileContent,
      handleCloseTab,
      onSwitchFile: handleFileTabSwitch
    });
    
    return cleanup;
  }, [
    openedFiles, 
    activeFilePath, 
    fileContent, 
    fetchFileContent, 
    handleCloseTab, 
    handleFileTabSwitch
  ]);

  /**
   * Handle window resize for editor height
   */
  useEffect(() => {
    const handleResize = () => {
      // Reset editor height based on window height
      const windowHeight = window.innerHeight;
      const minHeight = 200;
      const maxHeight = windowHeight * 0.7;
      const idealHeight = windowHeight * 0.5;
      
      setEditorHeight(Math.min(Math.max(idealHeight, minHeight), maxHeight));
    };
    
    // Initial size
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Handle editor resize
   */
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
  }, []);

  const handleResizing = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    
    const containerTop = document.getElementById('editor-container')?.getBoundingClientRect().top || 0;
    const newHeight = Math.max(100, e.clientY - containerTop);
    
    setEditorHeight(newHeight);
  }, [resizing]);

  const handleResizeEnd = useCallback(() => {
    setResizing(false);
  }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizing);
      window.addEventListener('mouseup', handleResizeEnd);
    } else {
      window.removeEventListener('mousemove', handleResizing);
      window.removeEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleResizing);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizing, handleResizing, handleResizeEnd]);

  /**
   * Open a file from path
   */
  const openFile = useCallback(async (path: string) => {
    // Check if file is already open
    const isFileOpen = openedFiles.some(file => file.path === path);
    
    if (isFileOpen) {
      // Switch to already open file
      handleFileTabSwitch(path);
      return;
    }
    
    // Fetch file content
    const content = await fetchFileContent(path);
    if (content === null) return;
    
    // Add file to opened files
    setOpenedFiles(prev => [
      ...prev,
      { path, content, hasUnsavedChanges: false }
    ]);
    
    // Set as active file
    setActiveFilePath(path);
    setFileContent(content);
    setHasUnsavedChanges(false);
  }, [openedFiles, fetchFileContent, handleFileTabSwitch]);

  return {
    // State
    openedFiles,
    activeFilePath,
    fileContent,
    hasUnsavedChanges,
    editorHeight,
    editorRef,
    
    // Getters
    getLanguageForPath,
    
    // Actions
    openFile,
    handleFileTabSwitch,
    handleCloseTab,
    handleContentChange,
    handleSave,
    handleEditorDidMount,
    handleResizeStart,
    
    // Utils
    setOpenedFiles,
    setActiveFilePath,
    setFileContent,
    setHasUnsavedChanges,
  };
}; 