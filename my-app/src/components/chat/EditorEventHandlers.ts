import * as monaco from 'monaco-editor';
import { Dispatch, SetStateAction } from 'react';
import { modelManager } from './EditorModelManager';
import { getLanguageFromFilePath } from '@/utils/languages';
import { safelyDetachModel, preventCanceledErrors } from './EditorCleanup';
import { OpenedFile, TabModelData } from './types';

/**
 * Handle file tab switching
 */
export const handleFileTabSwitch = async (
  path: string,
  activeFilePath: string,
  openedFiles: OpenedFile[],
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  setActiveFilePath: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setOpenedFiles: Dispatch<SetStateAction<OpenedFile[]>>,
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
  onSwitchFile?: (path: string) => void
): Promise<void> => {
  // Don't do anything if it's already the active file
  if (path === activeFilePath) return;
  
  console.log('Switching to file:', path);
  
  try {
    // Use a local state variable to prevent race conditions
    let isTabSwitchCancelled = false;
    
    // Find the target file
    const targetFile = openedFiles.find(file => file.path === path);
    if (!targetFile) {
      console.error(`File not found in opened files: ${path}`);
      return;
    }
    
    // Save the current tab's state before switching
    if (editorRef.current && activeFilePath) {
      try {
        // Take local references to values to avoid race conditions
        const currentEditor = editorRef.current;
        const currentPath = activeFilePath;
        
        // Get current content and view state
        const currentContent = currentEditor.getValue();
        
        // Save view state in safe way, catching any errors
        let currentViewState = null;
        try {
          currentViewState = currentEditor.saveViewState();
        } catch (e) {
          // Ignore any errors getting view state
        }
        
        // Get scroll info safely
        let scrollInfo = { scrollTop: 0, scrollLeft: 0 };
        try {
          scrollInfo = {
            scrollTop: currentEditor.getScrollTop(),
            scrollLeft: currentEditor.getScrollLeft()
          };
        } catch (e) {
          // Ignore scroll errors
        }
        
        // Save in model manager
        modelManager.saveTabViewState(currentPath, currentViewState, scrollInfo, currentContent);
        
        // Update open files state to remember any changes
        setOpenedFiles(prev => {
          // If operation was cancelled, don't update state
          if (isTabSwitchCancelled) return prev;
          
          return prev.map(file => {
            if (file.path === currentPath) {
              // Only update if content changed
              const hasChanged = file.content !== currentContent;
              if (hasChanged) {
                return { 
                  ...file, 
                  content: currentContent,
                  hasUnsavedChanges: hasChanged
                };
              }
            }
            return file;
          });
        });
      } catch (e) {
        // Ignore errors during state saving
      }
    }
    
    // First update activeFilePath state to trigger useEffect
    setActiveFilePath(path);
    
    // Skip checking for unsaved changes - we just want to switch without prompting
    
    // Ensure target file has a registered model
    const language = getLanguageFromFilePath(path);
    modelManager.registerTab(path, targetFile.content, language);
    modelManager.activateTab(path);
    
    // Introduce a short delay to let state updates settle
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Check if operation was cancelled
    if (isTabSwitchCancelled) return;
    
    // Apply the model change directly to editor if available
    if (editorRef.current) {
      // First detach current model
      const safelyDetachModelImpl = async () => {
        try {
          // Safely detach the model using our cleanup utility
          safelyDetachModel(editorRef.current);
        } catch (e) {
          // Ignore errors during model detachment
        }
      };
      
      // Apply the new model
      const applyNewModel = async () => {
        try {
          // Add defense against race conditions that cause Canceled errors
          preventCanceledErrors();
          
          // Add a small delay for smoother transitions
          await new Promise(resolve => setTimeout(resolve, 30));
          
          // Check if operation was cancelled or editor ref is gone
          if (isTabSwitchCancelled || !editorRef.current) return;
          
          // Get model from registry with proper type safety
          const tabData = modelManager.getTabModel(path);
          
          if (tabData.model) {
            // Add a staged transition approach for smoother experience
            // 1. First ensure the model is ready
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Set the model inside a try/catch with timeout to avoid race conditions
            try {
              // Set the model using setTimeout to avoid immediate callbacks
              await new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                  try {
                    if (!editorRef.current || isTabSwitchCancelled) {
                      resolve();
                      return;
                    }
                    
                    // Apply the model
                    editorRef.current.setModel(tabData.model);
                    resolve();
                  } catch (err) {
                    // Fail gracefully
                    console.warn('Error setting model:', err);
                    // Still resolve to continue the process
                    resolve();
                  }
                }, 10);
              });
            } catch (e) {
              // Log error but continue with fallback
              console.error('Error setting model, falling back to direct content update:', e);
              // Update content directly as fallback
              setFileContent(targetFile.content);
              return;
            }
            
            // Check again if operation was cancelled
            if (isTabSwitchCancelled) return;
            
            // Wait a bit before restoring state
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Restore view state if available with timeout
            const restoreViewState = async () => {
              if (isTabSwitchCancelled || !editorRef.current) return;
              
              if (tabData.viewState) {
                try {
                  editorRef.current.restoreViewState(tabData.viewState);
                } catch (e) {
                  // Ignore view state errors
                }
              }
            };
            
            // Start the restore but don't wait for it
            restoreViewState();
            
            // Restore scroll position with timeout
            const restoreScrollPosition = async () => {
              await new Promise(resolve => setTimeout(resolve, 30));
              
              if (isTabSwitchCancelled || !editorRef.current) return;
              
              if (tabData.scroll) {
                try {
                  editorRef.current.setScrollTop(tabData.scroll.scrollTop);
                  editorRef.current.setScrollLeft(tabData.scroll.scrollLeft);
                } catch (e) {
                  // Ignore scroll errors
                }
              }
            };
            
            // Start scroll restore but don't wait for it
            restoreScrollPosition();
            
            // Update content state
            setFileContent(tabData.model.getValue());
            
            // Update unsaved changes state
            setHasUnsavedChanges(targetFile.hasUnsavedChanges);
            
            // Focus editor after a short delay
            setTimeout(() => {
              if (isTabSwitchCancelled || !editorRef.current) return;
              
              try {
                editorRef.current.focus();
                editorRef.current.layout();
              } catch (e) {
                // Ignore focus/layout errors
              }
            }, 100);
          } else {
            // Fallback if model not found
            console.warn('No model found for tab:', path);
            
            // Update content from file state directly
            setFileContent(targetFile.content);
            setHasUnsavedChanges(targetFile.hasUnsavedChanges);
          }
        } catch (e) {
          console.error('Error applying new model:', e);
          
          // Fallback to basic content update
          setFileContent(targetFile.content);
          setHasUnsavedChanges(targetFile.hasUnsavedChanges);
        }
      };
      
      // Execute model change sequence with proper error handling
      await safelyDetachModelImpl().catch(() => {
        // Ignore errors and continue to applying new model
      });
      
      // Check if cancelled before applying new model
      if (isTabSwitchCancelled) return;
      
      await applyNewModel().catch(e => {
        // Log and recover from apply model errors
        console.error('Error during new model application:', e);
        
        // Fallback update
        setFileContent(targetFile.content);
        setHasUnsavedChanges(targetFile.hasUnsavedChanges);
      });
    } else {
      // Editor not available, just update state
      setFileContent(targetFile.content);
      setHasUnsavedChanges(targetFile.hasUnsavedChanges);
    }
    
    // Check if cancelled before calling external handler
    if (isTabSwitchCancelled) return;
    
    // Use external handler if provided
    if (typeof onSwitchFile === 'function') {
      onSwitchFile(path);
    }
  } catch (error) {
    console.error('Error during tab switch:', error);
    
    // Recovery: ensure we at least update content
    const targetFile = openedFiles.find(file => file.path === path);
    if (targetFile) {
      setFileContent(targetFile.content);
      setHasUnsavedChanges(targetFile.hasUnsavedChanges || false);
    }
  }
};

/**
 * Handle editor content changes
 */
export const handleContentChange = (
  newContent: string,
  activeFilePath: string,
  fileContent: string,
  setFileContent: Dispatch<SetStateAction<string>>,
  setOpenedFiles: Dispatch<SetStateAction<OpenedFile[]>>,
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>
): void => {
  if (!activeFilePath) return;
  
  // Skip if content hasn't changed
  if (newContent === fileContent) return;
  
  // Update file content
  setFileContent(newContent);
  
  // Update in model manager
  modelManager.updateTabContent(activeFilePath, newContent);
  
  // Update open files using functional update to prevent dependency loops
  setOpenedFiles(prev => {
    // Check if we actually need to update
    const fileToUpdate = prev.find(file => file.path === activeFilePath);
    if (!fileToUpdate || fileToUpdate.content === newContent) {
      return prev; // No change needed
    }
    
    // Only update the changed file
    return prev.map(file => 
      file.path === activeFilePath 
        ? { ...file, content: newContent, hasUnsavedChanges: true } 
        : file
    );
  });
  
  // Mark as unsaved
  setHasUnsavedChanges(true);
};

/**
 * Handle closing a file tab
 */
export const handleCloseTab = async (
  e: React.MouseEvent,
  path: string,
  activeFilePath: string,
  openedFiles: OpenedFile[],
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
  setOpenedFiles: Dispatch<SetStateAction<OpenedFile[]>>,
  setActiveFilePath: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
  saveFileContent: () => Promise<void>,
  onCloseFile?: (path: string) => void,
  onSwitchFile?: (path: string) => void, 
  cancelFileEditing?: () => void
): Promise<void> => {
  e.stopPropagation(); // Prevent triggering tab selection
  
  console.log('Closing file tab:', path);
  
  try {
    // Check for unsaved changes regardless of which tab it is
    const file = openedFiles.find(f => f.path === path);
    
    // We should prompt for save when the file has unsaved changes and is being closed
    if (file && file.hasUnsavedChanges) {
      // If it's the active file, get the current content from the editor
      let currentContent = file.content;
      if (path === activeFilePath && editorRef.current) {
        try {
          currentContent = editorRef.current.getValue();
        } catch (e) {
          console.error('Error getting editor value:', e);
        }
      }
      
      // Ask user if they want to save changes
      if (window.confirm(`Save changes to ${path.split('/').pop()} before closing?`)) {
        // Update file content in state
        setOpenedFiles(prev => 
          prev.map(f => 
            f.path === path
              ? { ...f, content: currentContent, hasUnsavedChanges: false }
              : f
          )
        );
        
        // If it's the active file, call save function
        if (path === activeFilePath) {
          await saveFileContent().catch(error => {
            console.error('Error saving file before close:', error);
          });
        }
      }
    }
    
    // Clean up the tab's model
    modelManager.disposeTabModel(path);
    
    // Remove file from state
    const newFiles = openedFiles.filter(file => file.path !== path);
    setOpenedFiles(newFiles);
    
    // If closing active file, switch to the next available file
    if (path === activeFilePath && newFiles.length > 0) {
      const nextFile = newFiles[0];
      
      // Use safe tab switching
      setTimeout(() => {
        handleFileTabSwitch(
          nextFile.path, 
          activeFilePath, 
          newFiles, 
          editorRef, 
          setActiveFilePath, 
          setFileContent, 
          setOpenedFiles, 
          setHasUnsavedChanges,
          onSwitchFile
        );
      }, 50);
    } else if (path === activeFilePath && newFiles.length === 0) {
      // If no files left, clear editor
      setActiveFilePath('');
      setFileContent('');
      setHasUnsavedChanges(false);
      
      // Detach model from editor
      if (editorRef.current) {
        safelyDetachModel(editorRef.current);
      }
      
      // Use external handler to close file editing if provided
      if (cancelFileEditing) {
        cancelFileEditing();
      }
    }
    
    // Use external handler if provided
    if (typeof onCloseFile === 'function') {
      onCloseFile(path);
    }
  } catch (e) {
    console.error('Error in handleCloseTab:', e);
  }
}; 