import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { safelyCleanupWordHighlighter } from './EditorCleanup';

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

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    try {
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
      }

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
    try {
      if (onChange && value !== undefined) {
        onChange(value);
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
   * Cleanup editor when component unmounts
   */
  useEffect(() => {
    return () => {
      try {
        // Use either the external or internal ref
        const editor = (externalEditorRef?.current || internalEditorRef.current);
        if (editor) {
          // Prevent "Canceled" errors during unmounting
          safelyCleanupWordHighlighter(editor);
          editor.dispose();
        }
      } catch (error) {
        console.error('Error during editor cleanup:', error);
      }
    };
  }, [externalEditorRef]);

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
          // Ensure Monaco Environment is properly configured
          if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
            console.warn('Monaco environment not properly set up. Some features may not work correctly.');
          }
        }}
        onValidate={(markers) => {
          // Process validation markers if needed
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent; 