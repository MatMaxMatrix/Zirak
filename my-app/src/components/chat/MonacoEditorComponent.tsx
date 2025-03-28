import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { safelyCleanupWordHighlighter, safelyDetachModel } from './EditorCleanup';

// Import monaco config to ensure it's loaded
import '../../utils/monaco-config';

interface MonacoEditorProps {
  // Allow either content or value prop
  content?: string;
  value?: string;
  path: string;
  language: string;
  height?: number | string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onChange?: (value: string) => void;
  onSave?: () => void;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  onError?: (error: Error) => void;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor>;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  path,
  content,
  value,
  language,
  height = '100%',
  options = {},
  onChange,
  onSave,
  onMount,
  onError,
  editorRef: externalEditorRef,
}) => {
  // Use value prop if provided, otherwise content
  const editorContent = value !== undefined ? value : (content || '');
  
  const internalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const prevPathRef = useRef<string>(path);
  const isMountedRef = useRef<boolean>(true);

  // Setup editor options with defaults
  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    automaticLayout: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    ...options,
  };

  // Keep track of component mounting state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    try {
      // If component is no longer mounted, don't do anything
      if (!isMountedRef.current) {
        console.warn('Editor mounted after component unmounted, skipping setup');
        return;
      }
      
      // Set internal ref
      internalEditorRef.current = editor;
      monacoRef.current = monaco;
      
      // Update external ref if provided
      if (externalEditorRef) {
        (externalEditorRef as any).current = editor;
      }

      // Setup keyboard shortcuts for saving
      if (onSave) {
        // Add Cmd+S (Mac) and Ctrl+S (Windows/Linux) shortcuts
        try {
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, 
            () => {
              // Prevent default browser save dialog
              editor.trigger('keyboard', 'editor.action.stopFindInSelection', null);
              onSave();
            },
            // Higher priority to override browser default
            '!findWidgetVisible && !inReferenceSearchEditor && !editorHasSelection'
          );
        } catch (keyError) {
          console.warn('Could not add keyboard shortcut:', keyError);
        }
      }

      // Ensure cursor is visible without requiring a click
      setTimeout(() => {
        if (editor && isMountedRef.current) {
          // Focus the editor
          editor.focus();

          // Get current cursor position
          const currentPosition = editor.getPosition();
          
          // If no position set, place at end of first line
          if (!currentPosition) {
            const model = editor.getModel();
            if (model && model.getLineCount() > 0) {
              const firstLine = model.getLineContent(1);
              // Use proper IPosition interface instead of custom object
              const newPosition: monaco.IPosition = {
                lineNumber: 1,
                column: firstLine.length + 1
              };
              editor.setPosition(newPosition);
              
              // Ensure cursor is visible
              editor.revealPositionInCenter(newPosition);
              // Trigger a dummy edit to make cursor blink and be visible
              editor.trigger('keyboard', 'type', { text: '' });
            }
          } else {
            // For existing position, make it visible
            editor.revealPositionInCenter(currentPosition);
            // Trigger a dummy edit to make cursor blink and be visible
            editor.trigger('keyboard', 'type', { text: '' });
          }
        }
      }, 100);

      // Call external onMount if provided
      if (onMount) {
        onMount(editor, monaco);
      }
    } catch (error) {
      console.error('Error during editor mount:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  /**
   * Handle content change
   */
  const handleChange = (value: string | undefined) => {
    // Skip if component is unmounted
    if (!isMountedRef.current) return;
    
    try {
      if (onChange && value !== undefined) {
        onChange(value);
        
        // After content change, ensure cursor is still visible using helper
        setTimeout(() => {
          keepCursorFocused(internalEditorRef.current);
        }, 10);
      }
    } catch (error) {
      console.error('Error during content change:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  /**
   * Setup window level keyboard shortcut for save
   */
  useEffect(() => {
    if (!onSave) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    
    // Add global event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

  /**
   * Handle smooth transitions between files
   */
  useEffect(() => {
    // Skip transition animation on first render
    if (prevPathRef.current !== path && prevPathRef.current !== '') {
      // Start transition out
      setIsTransitioning(true);
      setOpacity(0);

      // Set timeout for animation
      const timeout = setTimeout(() => {
        setOpacity(1);
        
        // Set timeout for ending transition state
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      }, 150);

      return () => clearTimeout(timeout);
    }

    prevPathRef.current = path;
  }, [path]);

  /**
   * Helper function to ensure cursor is visible
   */
  const keepCursorFocused = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
    if (!editor || !isMountedRef.current) return;
    
    try {
      // Focus the editor
      editor.focus();
      
      // Get current cursor position
      const position = editor.getPosition();
      if (position) {
        // Make sure cursor is visible in viewport
        editor.revealPositionInCenterIfOutsideViewport(position);
        
        // Force cursor to be visible
        setTimeout(() => {
          if (editor && isMountedRef.current) {
            // Re-focus to ensure cursor is blinking
            editor.focus();
            // Force cursor to render by simulating typing
            editor.trigger('keyboard', 'type', { text: '' });
          }
        }, 10);
      }
    } catch (e) {
      console.warn('Error ensuring cursor visibility:', e);
    }
  };

  /**
   * Keep editor focused
   */
  useEffect(() => {
    // Skip if transitioning
    if (isTransitioning) return;
    
    // Focus editor with a slight delay after content updates
    const focusTimeout = setTimeout(() => {
      keepCursorFocused(internalEditorRef.current);
    }, 200);
    
    return () => clearTimeout(focusTimeout);
  }, [isTransitioning, editorContent]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (internalEditorRef.current) {
        try {
          // Safely detach the model first
          safelyDetachModel(internalEditorRef.current);
          // Clean up word highlighter
          safelyCleanupWordHighlighter(internalEditorRef.current);
          // Dispose the editor
          internalEditorRef.current.dispose();
        } catch (error) {
          console.debug('Error during editor cleanup:', error);
        }
      }
    };
  }, []);

  return (
    <div 
      style={{ 
        opacity, 
        transition: 'opacity 150ms ease-in-out',
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      <Editor
        path={path}
        defaultLanguage={language}
        defaultValue={editorContent}
        value={isTransitioning ? '' : editorContent}
        height="100%"
        options={editorOptions}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        loading={<div className="editor-loading">Loading editor...</div>}
        beforeMount={(monaco) => {
          // Only proceed if the component is still mounted
          if (!isMountedRef.current) return;
          
          // Ensure Monaco Environment is properly configured
          if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
            console.warn('Monaco environment not properly set up. Some features may not work correctly.');
          }
        }}
        onValidate={(markers) => {
          // Skip if component is unmounted
          if (!isMountedRef.current) return;
          
          // Process validation markers if needed
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent; 