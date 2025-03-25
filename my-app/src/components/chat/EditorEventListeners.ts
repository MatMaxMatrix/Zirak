import { Dispatch, SetStateAction } from 'react';
import { OpenedFile } from './types';

/**
 * Event type definitions
 */
export interface FileRefreshEvent extends CustomEvent {
  detail: {
    path: string;
  };
}

export interface FileOpenedEvent extends CustomEvent {
  detail: {
    path: string;
    content: string;
    hasUnsavedChanges?: boolean;
  };
}

export interface FileSwitchEvent extends CustomEvent {
  detail: {
    path: string;
    content?: string;
    hasUnsavedChanges?: boolean;
  };
}

/**
 * Setup file system event listeners
 */
export const setupFileEventListeners = ({
  openedFiles,
  activeFilePath,
  fileContent,
  setFileContent,
  setOpenedFiles,
  setActiveFilePath,
  setHasUnsavedChanges,
  fetchFileContent,
  handleCloseTab,
  onSwitchFile
}: {
  openedFiles: OpenedFile[],
  activeFilePath: string,
  fileContent: string,
  setFileContent: Dispatch<SetStateAction<string>>,
  setOpenedFiles: Dispatch<SetStateAction<OpenedFile[]>>,
  setActiveFilePath: Dispatch<SetStateAction<string>>,
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
  fetchFileContent: (path: string) => Promise<string | null>,
  handleCloseTab: (e: any, path: string) => void,
  onSwitchFile?: (path: string) => void
}): () => void => {

  /**
   * Handle file refresh events
   */
  const handleFileRefreshNeeded = (event: FileRefreshEvent) => {
    const { path } = event.detail;
    
    // Only refresh if the file is open
    const fileToRefresh = openedFiles.find(file => file.path === path);
    if (!fileToRefresh) return;
    
    // Skip files with unsaved changes
    if (fileToRefresh.hasUnsavedChanges) {
      console.log(`Not refreshing ${path} due to unsaved changes`);
      return;
    }
    
    // Fetch fresh content
    fetchFileContent(path).then(content => {
      if (content === null) return;
      
      // Update file in state
      setOpenedFiles(prev => 
        prev.map(file => 
          file.path === path
            ? { ...file, content, hasUnsavedChanges: false }
            : file
        )
      );
      
      // If this is the active file, update editor
      if (path === activeFilePath) {
        setFileContent(content);
        setHasUnsavedChanges(false);
      }
    });
  };
  
  /**
   * Handle file opened events
   */
  const handleFileOpenedFresh = (event: FileOpenedEvent) => {
    const { path, content, hasUnsavedChanges = false } = event.detail;
    
    // Skip if content hasn't changed to prevent loops
    const existingFile = openedFiles.find(file => file.path === path);
    if (existingFile && existingFile.content === content && existingFile.hasUnsavedChanges === hasUnsavedChanges) {
      return;
    }
    
    // Update or add file
    setOpenedFiles(prev => {
      const fileExists = prev.some(file => file.path === path);
      
      if (fileExists) {
        // Skip updating if file has unsaved changes
        return prev.map(file => 
          file.path === path && !file.hasUnsavedChanges
            ? { ...file, content, hasUnsavedChanges }
            : file
        );
      } else {
        // Add new file
        return [
          ...prev,
          { path, content, hasUnsavedChanges }
        ];
      }
    });
  };
  
  /**
   * Handle file switch events
   */
  const handleFileSwitch = (event: FileSwitchEvent) => {
    const { path, content, hasUnsavedChanges } = event.detail;
    
    // Skip if already active to prevent loops
    if (path === activeFilePath) return;
    
    // Ensure file exists
    const fileExists = openedFiles.some(file => file.path === path);
    
    if (!fileExists && content !== undefined) {
      // Add file if it doesn't exist
      setOpenedFiles(prev => [
        ...prev,
        { 
          path, 
          content, 
          hasUnsavedChanges: hasUnsavedChanges || false
        }
      ]);
    }
    
    // Switch to file
    setActiveFilePath(path);
    
    // Find file to get content
    const targetFile = openedFiles.find(file => file.path === path);
    if (targetFile) {
      // Only update if content is different
      if (fileContent !== targetFile.content) {
        setFileContent(targetFile.content);
      }
      // Only update if hasUnsavedChanges is different
      if (hasUnsavedChanges !== targetFile.hasUnsavedChanges) {
        setHasUnsavedChanges(targetFile.hasUnsavedChanges);
      }
    } else if (content !== undefined) {
      setFileContent(content);
      setHasUnsavedChanges(hasUnsavedChanges || false);
    }
    
    // Call external handler if provided
    if (onSwitchFile) {
      onSwitchFile(path);
    }
  };
  
  /**
   * Handle file close events
   */
  const handleFileClose = (event: CustomEvent) => {
    const { path } = event.detail || {};
    
    if (!path) return;
    
    // Find the file
    const fileToClose = openedFiles.find(file => file.path === path);
    if (!fileToClose) return;
    
    // Check for unsaved changes
    if (fileToClose.hasUnsavedChanges) {
      const fileName = path.split('/').pop() || path;
      const shouldClose = window.confirm(`File "${fileName}" has unsaved changes. Close without saving?`);
      if (!shouldClose) return;
    }
    
    // Close the file
    handleCloseTab(
      // Create a synthetic event since we don't have a mouse event
      {
        stopPropagation: () => {},
        preventDefault: () => {}
      } as unknown as React.MouseEvent, 
      path
    );
  };
  
  // Register event listeners
  window.addEventListener('file-refresh-needed', handleFileRefreshNeeded as EventListener);
  window.addEventListener('file-opened-fresh', handleFileOpenedFresh as EventListener);
  window.addEventListener('editor-file-switch', handleFileSwitch as EventListener);
  window.addEventListener('file-edit-close', handleFileClose as EventListener);
  
  // Return cleanup function
  return () => {
    // Clean up listeners
    window.removeEventListener('file-refresh-needed', handleFileRefreshNeeded as EventListener);
    window.removeEventListener('file-opened-fresh', handleFileOpenedFresh as EventListener);
    window.removeEventListener('editor-file-switch', handleFileSwitch as EventListener);
    window.removeEventListener('file-edit-close', handleFileClose as EventListener);
  };
}; 