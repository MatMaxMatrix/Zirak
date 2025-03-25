import { useEffect, useRef, useCallback, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Uri } from 'monaco-editor';
import { Save } from 'lucide-react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onSave: () => void;
  height: string;
  editorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

// Unique ID for each editor instance to avoid DOM context conflicts
let editorInstanceCounter = 0;

// Create a single global registry to track and limit listeners
const globalListenerRegistry = {
  count: 0,
  maxListeners: 100,
  logWarningAt: 50,
  listenerSources: new Map<string, number>(),
  
  registerListener(source: string) {
    this.count++;
    const currentCount = this.listenerSources.get(source) || 0;
    this.listenerSources.set(source, currentCount + 1);
    
    if (this.count >= this.maxListeners) {
      console.warn(`Monaco editor has ${this.count} listeners registered (limit: ${this.maxListeners}). Consider disposing editors.`);
      // Log the top sources
      const sources = Array.from(this.listenerSources.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      console.warn('Top listener sources:', sources);
    }
  },
  
  unregisterListener(source: string) {
    this.count = Math.max(0, this.count - 1);
    const currentCount = this.listenerSources.get(source) || 0;
    if (currentCount > 1) {
      this.listenerSources.set(source, currentCount - 1);
    } else {
      this.listenerSources.delete(source);
    }
  },
  
  reset() {
    this.count = 0;
    this.listenerSources.clear();
  }
};

function MonacoEditor({ value, language, onChange, onSave, height, editorDidMount, options = {} }: MonacoEditorProps) {
  // Create a unique ID for this editor instance including a timestamp for true uniqueness
  const [editorId] = useState(() => `monaco-editor-${++editorInstanceCounter}-${Date.now()}`);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const isMountedRef = useRef(true);
  const isDisposingRef = useRef(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const uniqueDomIdRef = useRef(`monaco-container-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  
  // Handle save shortcut outside the editor
  const handleGlobalSave = useCallback((e: KeyboardEvent) => {
    if (!isMountedRef.current) return;
    
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      onSave();
      return false;
    }
  }, [onSave]);
  
  // Safe disposal of all resources
  const cleanupResources = useCallback(() => {
    // Skip if already disposing
    if (isDisposingRef.current) return;
    isDisposingRef.current = true;
    
    try {
      // Remove global event listener
      document.removeEventListener('keydown', handleGlobalSave, true);
      
      // First clear the DOM container to prevent any UI conflicts
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      // Store references and clear refs immediately to prevent access
      const editor = editorRef.current;
      editorRef.current = null;
      
      const model = modelRef.current;
      modelRef.current = null;
      
      const disposables = [...disposablesRef.current];
      disposablesRef.current = [];
      
      // Reset state
      setIsEditorReady(false);
      
      // First disable word highlighting and other features that might cause issues
      if (editor) {
        try {
          // Disable features that might cause the "Canceled" error - using only compatible options
          editor.updateOptions({
            // @ts-ignore - Type mismatch between Monaco versions
            wordBasedSuggestions: false,
            wordWrap: 'off',
            renderWhitespace: 'none',
            // @ts-ignore - Type mismatch between Monaco versions
            occurrencesHighlight: false,
            // @ts-ignore - Type mismatch between Monaco versions
            selectionHighlight: false
          });
          
          // Try to access internal editor components and disable highlighted words 
          try {
            // @ts-ignore - Access internal editor properties to disable features
            const editorImpl = editor._codeEditorService;
            if (editorImpl && typeof editorImpl.disposeAllWordHighlighters === 'function') {
              editorImpl.disposeAllWordHighlighters();
            }
            
            // Alternative approach to direct Monaco internal - find highlighters for this editor
            // @ts-ignore - Access internal editor properties
            const contributions = editor._contributions;
            if (contributions) {
              const highlighterContribution = contributions['editor.contrib.wordHighlighter'];
              if (highlighterContribution) {
                // Try to dispose the highlighter specifically
                try {
                  highlighterContribution.dispose();
                } catch (e) {
                  // Ignore if already disposed
                }
              }
            }
          } catch (e) {
            // Ignore internal API errors
            console.warn('Internal editor API access error during disposal:', e);
          }
        } catch (e) {
          // Ignore errors updating options
          console.warn('Error updating editor options during disposal:', e);
        }
      }
      
      // Use a sequence of deferred operations with increasing delays
      setTimeout(() => {
        try {
          // First set editor model to null without disposing the model yet
          if (editor) {
            try {
              editor.setModel(null);
            } catch (e) {
              // Ignore setModel errors
              console.warn('Error setting model to null during disposal:', e);
            }
          }
          
          // Wait longer before disposing the editor
          setTimeout(() => {
            try {
              // Now dispose the editor
              if (editor) {
                editor.dispose();
              }
              
              // Wait even longer before disposing the model
              setTimeout(() => {
                try {
                  // First dispose each disposable individually
                  for (const disposable of disposables) {
                    try {
                      if (disposable) disposable.dispose();
                    } catch (err) {
                      // Ignore individual disposal errors
                    }
                  }
                  
                  // Finally dispose model if it still exists
                  if (model && !model.isDisposed()) {
                    try {
                      // Special handling to fix the Canceled error shown in the stack trace
                      // We need to handle internal delayers that might be canceled during disposal
                      
                      // First ensure any listeners are removed to prevent cascading disposal
                      const uri = model.uri.toString();
                      
                      // Access private properties only after checking if the model is safe to dispose
                      const safeModelDispose = () => {
                        try {
                          // Monkey patch the dispose method to catch "Canceled" errors
                          const originalDispose = model.dispose.bind(model);
                          
                          // @ts-ignore - We're monkey patching
                          model.dispose = function() {
                            try {
                              return originalDispose();
                            } catch (e) {
                              // Catch the specific "Canceled" error
                              if (e instanceof Error && e.message === 'Canceled') {
                                console.debug('Safely handled "Canceled" error during model disposal');
                                // Mark as disposed to prevent further access attempts
                                // @ts-ignore - Setting internal property
                                this._isDisposed = true;
                              } else {
                                // Re-throw other errors
                                throw e;
                              }
                            }
                          };
                          
                          // Now call the wrapped dispose method
                          model.dispose();
                        } catch (e) {
                          // Last resort - if we still get an error, just suppress it
                          console.debug('Suppressed error during model cleanup:', e);
                        }
                      };
                      
                      // Execute with a delay to ensure all operations are done
                      setTimeout(safeModelDispose, 50);
                    } catch (modelError) {
                      // Ignore model disposal errors
                      console.debug('Error disposing model:', modelError);
                    }
                  }
                } catch (e) {
                  // Ignore model cleanup errors
                } finally {
                  isDisposingRef.current = false;
                }
              }, 150); // Even longer delay for final model cleanup
            } catch (e) {
              // Ignore editor disposal errors
              isDisposingRef.current = false;
            }
          }, 100); // Longer delay for editor disposal
        } catch (e) {
          // Ignore outer try block errors
          isDisposingRef.current = false;
        }
      }, 50); // Initial delay before starting disposal sequence
    } catch (e) {
      console.error('Error in cleanup setup:', e);
      isDisposingRef.current = false;
    }
  }, [handleGlobalSave]);
  
  // Initialize the editor
  useEffect(() => {
    isMountedRef.current = true;
    
    // Function to initialize Monaco
    const initMonaco = async () => {
      if (!containerRef.current || editorRef.current || !isMountedRef.current) return;
      
      // Completely recreate the container element to avoid context conflicts
      // This is based on the fix from kubeshop/monokle
      const parentElement = containerRef.current.parentElement;
      if (!parentElement) return;
      
      const oldContainer = containerRef.current;
      const newContainer = document.createElement('div');
      newContainer.className = oldContainer.className;
      newContainer.style.cssText = 'width: 100%; height: 100%';
      
      // Replace the container
      parentElement.replaceChild(newContainer, oldContainer);
      // Update the ref using proper React method instead of direct assignment
      const currentRef = containerRef as React.MutableRefObject<HTMLDivElement>;
      currentRef.current = newContainer;
      
      try {
        // Find and dispose any orphaned models to prevent memory leaks
        monaco.editor.getModels().forEach(model => {
          try {
            const editors = monaco.editor.getEditors();
            const isOrphaned = !editors.some(editor => editor.getModel() === model);
            
            if (isOrphaned && !model.isDisposed()) {
              model.dispose();
            }
          } catch (e) {
            // Ignore errors
          }
        });
        
        // Create editor with minimal options and NO model initially
        const safeOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
          ...options,
          theme: 'vs-dark',
          value: undefined, // No initial value
          language: undefined, // No initial language
          model: null, // No initial model
          minimap: { enabled: false },
          folding: false,
          lineNumbers: 'on' as monaco.editor.LineNumbersType,
          renderWhitespace: 'none',
          parameterHints: { enabled: false },
          suggest: { 
            showIcons: false,
            showStatusBar: false,
            preview: false,
            showInlineDetails: false
          },
          automaticLayout: true,
        };
        
        // Create editor
        const editor = monaco.editor.create(containerRef.current, safeOptions);
        editorRef.current = editor;
        
        // Create model separately (AFTER editor is created)
        const uri = Uri.parse(`file:///${editorId}`);
        
        // Check if a model with this URI already exists
        let model: monaco.editor.ITextModel;
        
        // Look for existing models with the same URI
        const existingModels = monaco.editor.getModels().filter(m => 
          m.uri.toString() === uri.toString()
        );
        
        // Dispose any existing models with the same URI
        existingModels.forEach(m => {
          try {
            if (m && !m.isDisposed()) {
              m.dispose();
            }
          } catch (err) {
            console.warn('Error disposing existing model:', err);
          }
        });
        
        // Now create a new model
        model = monaco.editor.createModel(value || '', language || 'plaintext', uri);
        modelRef.current = model;
        
        // Add disposables
        const modelDisposeListener = model.onWillDispose(() => {
          if (modelRef.current === model) {
            modelRef.current = null;
          }
        });
        disposablesRef.current.push(modelDisposeListener);
        
        const editorDisposeListener = editor.onDidDispose(() => {
          if (editorRef.current === editor) {
            editorRef.current = null;
          }
        });
        disposablesRef.current.push(editorDisposeListener);
        
        // Set up content change listener
        const changeDisposable = model.onDidChangeContent(() => {
          if (!isMountedRef.current || !modelRef.current || modelRef.current.isDisposed()) return;
          
          try {
            const newValue = model.getValue();
            onChange(newValue);
          } catch (e) {
            // Ignore errors
          }
        });
        disposablesRef.current.push(changeDisposable);
        
        // Wait until BOTH editor and model are ready before connecting them
        setTimeout(() => {
          if (!isMountedRef.current || !editorRef.current || !modelRef.current) return;
          
          try {
            // Now set the model on the editor
            editor.setModel(model);
            
            // Add save action
            editor.addAction({
              id: 'save-action',
              label: 'Save',
              keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
              run: () => {
                if (isMountedRef.current) {
                  onSave();
                }
              }
            });
            
            // Add global save handler
            document.addEventListener('keydown', handleGlobalSave, true);
            
            // Mark editor as ready
            setIsEditorReady(true);
            
            // Call editorDidMount callback
            if (editorDidMount) {
              try {
                editorDidMount(editor);
              } catch (e) {
                console.error('Error in editorDidMount callback:', e);
              }
            }
          } catch (e) {
            console.error('Error setting up editor:', e);
          }
        }, 50);
      } catch (error) {
        console.error('Error initializing Monaco editor:', error);
        cleanupResources();
      }
    };
    
    // Use timeout to ensure DOM is ready
    const timer = setTimeout(initMonaco, 10);
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      
      // Mark as unmounted before cleanup
      isMountedRef.current = false;
      
      // Use setTimeout to ensure we're not in a React render cycle
      setTimeout(cleanupResources, 0);
    };
  }, [cleanupResources, editorDidMount, handleGlobalSave, language, onChange, onSave, options, value]);
  
  // Update content when value prop changes
  useEffect(() => {
    if (!isEditorReady || !modelRef.current || modelRef.current.isDisposed()) return;
    
    const model = modelRef.current;
    const currentValue = model.getValue();
    
    if (value !== currentValue) {
      try {
        // Add a subtle transition effect to make content changes smoother
        if (containerRef.current) {
          containerRef.current.classList.add('switching');
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.classList.remove('switching');
            }
          }, 200);
        }
        
        model.setValue(value);
      } catch (e) {
        // Ignore errors
      }
    }
  }, [value, isEditorReady]);
  
  // Update language when it changes
  useEffect(() => {
    if (!isEditorReady || !modelRef.current || modelRef.current.isDisposed()) return;
    
    try {
      const currentLanguage = modelRef.current.getLanguageId();
      
      // Only change if different to avoid unnecessary reconfiguration
      if (currentLanguage !== language) {
        monaco.editor.setModelLanguage(modelRef.current, language);
      }
    } catch (e) {
      // Ignore errors
    }
  }, [language, isEditorReady]);
  
  // Update layout when height changes
  useEffect(() => {
    if (!isEditorReady || !editorRef.current) return;
    
    try {
      editorRef.current.layout();
    } catch (e) {
      // Ignore errors
    }
  }, [height, isEditorReady]);
  
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          transition: 'opacity 150ms ease-in-out'
        }}
        className="monaco-editor-container"
      />
      <style jsx>{`
        .monaco-editor-container {
          position: relative;
        }
        .monaco-editor-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          pointer-events: none;
          transition: background-color 150ms ease;
        }
        .monaco-editor-container.switching::after {
          background-color: rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

export default MonacoEditor; 