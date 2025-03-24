import { useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { Uri } from 'monaco-editor';
import { Save } from 'lucide-react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onSave: () => void;
  height: string;
}

export function MonacoEditor({ value, language, onChange, onSave, height }: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<monaco.IDisposable | null>(null);
  const isDisposingRef = useRef(false);
  const uriRef = useRef<Uri | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const initializedRef = useRef(false);
  
  // Track the key event listeners to clean them up properly
  const listenersRef = useRef<{element: EventTarget, type: string, listener: EventListener, options?: boolean}[]>([]);

  const disposeEditor = useCallback(() => {
    // If already in the process of disposing, prevent re-entrance
    if (isDisposingRef.current) return;
    isDisposingRef.current = true;

    try {
      // Remove all event listeners
      listenersRef.current.forEach(({ element, type, listener, options }) => {
        try {
          element.removeEventListener(type, listener, options);
        } catch (err) {
          console.warn(`Failed to remove event listener ${type}:`, err);
        }
      });
      listenersRef.current = [];

      // First dispose of the subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing subscription:', e);
        }
        subscriptionRef.current = null;
      }

      // Then dispose of the model
      if (modelRef.current) {
        try {
          const model = modelRef.current;
          modelRef.current = null; // Nullify first to prevent circular disposal
          model.dispose();
        } catch (e) {
          console.warn('Error disposing model:', e);
        }
      }

      // Finally dispose of the editor (should be last as it might depend on model)
      if (editorRef.current) {
        try {
          const editor = editorRef.current;
          editorRef.current = null; // Nullify first to prevent circular disposal
          editor.dispose();
        } catch (e) {
          console.warn('Error disposing editor:', e);
        }
      }

      uriRef.current = null;
      initializedRef.current = false;
    } catch (error) {
      console.warn('Error during disposal process:', error);
    } finally {
      isDisposingRef.current = false;
    }
  }, []);

  const addSafeEventListener = useCallback((
    element: EventTarget, 
    type: string, 
    listener: EventListener, 
    options?: boolean
  ) => {
    element.addEventListener(type, listener, options);
    listenersRef.current.push({ element, type, listener, options });
  }, []);

  const handleSave = useCallback(() => {
    console.log('Save command triggered');
    onSave();
  }, [onSave]);

  const initializeEditor = useCallback(() => {
    if (!containerRef.current || initializedRef.current) return;
    
    // Clear any existing editor first
    disposeEditor();
    
    // Set initialization flag to prevent multiple editors
    initializedRef.current = true;

    try {
      // Create a unique URI for the model
      const uri = Uri.parse(`file:///editor-${Date.now()}`);
      uriRef.current = uri;

      // Create a new model
      const model = monaco.editor.createModel(value, language, uri);
      modelRef.current = model;

      // Create editor instance
      const editor = monaco.editor.create(containerRef.current, {
        model,
        theme: 'vs-dark',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
      });

      editorRef.current = editor;

      // Register save command with various key combinations to ensure it works across platforms
      editor.addAction({
        id: 'save-file',
        label: 'Save File',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        ],
        run: handleSave
      });

      // Set up content change listener
      const subscription = editor.onDidChangeModelContent(() => {
        if (!isDisposingRef.current && editorRef.current) {
          try {
            const newValue = editorRef.current.getValue();
            onChange(newValue);
          } catch (e) {
            console.warn('Error getting editor value:', e);
          }
        }
      });
      
      subscriptionRef.current = subscription;

      // Add global document level handler for Command+S/Ctrl+S
      const handleGlobalSave = (e: Event) => {
        const kbEvent = e as KeyboardEvent;
        if ((kbEvent.metaKey || kbEvent.ctrlKey) && kbEvent.key.toLowerCase() === 's') {
          e.preventDefault();
          e.stopPropagation();
          handleSave();
          return false;
        }
      };

      // Use capture phase to intercept the event early
      addSafeEventListener(document, 'keydown', handleGlobalSave as EventListener, true);

      return;
    } catch (error) {
      console.error('Error initializing editor:', error);
      disposeEditor();
      return;
    }
  }, [value, language, onChange, onSave, disposeEditor, handleSave, addSafeEventListener]);

  // Initialize editor only once on mount
  useEffect(() => {
    initializeEditor();
    
    // Return cleanup function
    return () => {
      disposeEditor();
    };
  }, []);

  // Update value when prop changes - using a separate effect
  useEffect(() => {
    if (isDisposingRef.current || !editorRef.current) return;
    
    try {
      // Check if the model is still valid
      const model = editorRef.current.getModel();
      if (!model) return;
      
      const currentValue = model.getValue();
      if (value !== currentValue) {
        // Use the model's setValue to update content
        model.setValue(value);
      }
    } catch (e) {
      console.warn('Error updating editor value:', e);
    }
  }, [value]);

  // Update language when prop changes
  useEffect(() => {
    if (isDisposingRef.current || !modelRef.current) return;
    
    try {
      monaco.editor.setModelLanguage(modelRef.current, language);
    } catch (e) {
      console.warn('Error updating editor language:', e);
    }
  }, [language]);

  // Update layout when height changes
  useEffect(() => {
    if (isDisposingRef.current || !editorRef.current) return;
    
    try {
      // Throttle layout updates to reduce UI jank
      const layoutUpdate = () => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      };
      
      // Throttled layout update using requestAnimationFrame for better performance
      const rafId = requestAnimationFrame(layoutUpdate);
      
      return () => {
        cancelAnimationFrame(rafId);
      };
    } catch (e) {
      console.warn('Error updating editor layout:', e);
    }
  }, [height]);

  return (
    <div className="relative" style={{ width: '100%', height }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%' 
        }}
      />
      <button
        onClick={handleSave}
        className="absolute top-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md z-10 shadow-lg flex items-center gap-1.5"
        title="Save (⌘S on Mac, Ctrl+S on Windows/Linux)"
      >
        <Save size={16} />
        <span className="text-xs font-medium">Save</span>
      </button>
    </div>
  );
} 