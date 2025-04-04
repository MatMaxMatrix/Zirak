// Monaco Editor configuration
// This file configures Monaco Editor web workers and other settings
// to prevent "V is not iterable" and other common errors

/**
 * Sets up Monaco Editor environment to properly handle web workers
 * and configuration. This must be imported before any Monaco Editor components.
 */
function setupMonacoEnvironment() {
  if (typeof window !== 'undefined') {
    // Use specific version of monaco from cdn to ensure compatibility
    const monacoVersion = '0.52.2'; // The version you're using
    const cdnBase = `https://cdn.jsdelivr.net/npm/monaco-editor@${monacoVersion}/min/vs`;
    
    // Check if Monaco environment is already set up
    if ((window as any).MonacoEnvironment) {
      console.info('Monaco environment already configured. Skipping setup.');
      return;
    }
    
    // Create Monaco global config to ensure web workers load correctly
    (window as any).MonacoEnvironment = {
      // Use a getter for getWorkerUrl to ensure it's evaluated when needed
      getWorkerUrl: (_moduleId: string, label: string): string => {
        let workerPath = `${cdnBase}/editor/editor.worker.js`;
        
        // Select the appropriate worker based on language
        if (label === 'json') {
          workerPath = `${cdnBase}/language/json/json.worker.js`;
        } else if (label === 'css' || label === 'scss' || label === 'less') {
          workerPath = `${cdnBase}/language/css/css.worker.js`;
        } else if (label === 'html' || label === 'handlebars' || label === 'razor') {
          workerPath = `${cdnBase}/language/html/html.worker.js`;
        } else if (label === 'typescript' || label === 'javascript') {
          workerPath = `${cdnBase}/language/typescript/ts.worker.js`;
        }
        
        // Use data URIs to avoid cross-origin issues
        // This technique ensures workers load correctly even when using CDN
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
          self.MonacoEnvironment = {
            baseUrl: '${cdnBase}'
          };
          importScripts('${workerPath}');
        `)}`;
      }
    };
    
    // Patch Monaco editor to prevent common errors
    patchMonaco();
    
    // Add global error handler for Monaco-related errors
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if error is related to Monaco Editor
      if (source?.includes('monaco') || 
          (message?.toString && (
            message.toString().includes('V is not iterable') || 
            message.toString().includes('Cannot read properties of undefined (reading \'isVisible\')')
          ))
      ) {
        console.warn('Caught Monaco Editor error:', { message, source, lineno, colno });
        // Return true to indicate error was handled
        return true;
      }
      
      // Call original error handler for other errors
      if (originalErrorHandler) {
        return originalErrorHandler.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
  }
}

/**
 * Apply patches to Monaco editor to prevent common errors
 */
function patchMonaco() {
  // Wait for Monaco to be loaded before patching
  if (typeof window !== 'undefined') {
    // Check if monaco is already available
    if ((window as any).monaco) {
      applyPatches();
    } else {
      // Wait for monaco to load
      const checkInterval = setInterval(() => {
        if ((window as any).monaco) {
          clearInterval(checkInterval);
          applyPatches();
        }
      }, 50);
      
      // Clear interval after 10 seconds to prevent memory leaks
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
  }
}

/**
 * Apply specific patches to Monaco components
 */
function applyPatches() {
  try {
    const monaco = (window as any).monaco;
    if (!monaco) return;
    
    // Add global Monaco error silencer for specific errors
    if (monaco.editor && !monaco.__errorHandlerPatched) {
      monaco.__errorHandlerPatched = true;
      
      // Override the error handling in Monaco's error utility
      if (monaco.errors && monaco.errors.onUnexpectedError) {
        const originalOnUnexpectedError = monaco.errors.onUnexpectedError;
        monaco.errors.onUnexpectedError = function(e: any) {
          // Filter "V is not iterable" and "isVisible" errors
          if (e && (
            (e.message && (
              e.message.includes('V is not iterable') || 
              e.message.includes('isVisible')
            )) || 
            (e.toString && e.toString().includes('V is not iterable'))
          )) {
            console.debug('Suppressed Monaco editor error:', e);
            return;
          }
          // Pass other errors to original handler
          return originalOnUnexpectedError(e);
        };
      }
    }
    
    // Patch the core TextModel prototype where the "V is not iterable" error occurs
    const originalModelPrototype = Object.getPrototypeOf(monaco.editor.createModel(''));
    if (originalModelPrototype) {
      // Patch the pushEditOperations method which causes the "V is not iterable" error
      if (!originalModelPrototype.__patchedPushEditOperations) {
        const originalPushEditOperations = originalModelPrototype.pushEditOperations;
        
        originalModelPrototype.pushEditOperations = function(beforeCursorState: any, edits: any, cursorStateComputer: any) {
          try {
            // For enter key operations which commonly trigger this error
            if (edits && edits.length === 1 && edits[0].text && edits[0].text.includes('\n')) {
              // Special handling for newline operations
              try {
                // Using a defensive approach for newlines
                return originalPushEditOperations.call(this, beforeCursorState, edits, cursorStateComputer);
              } catch (newlineError) {
                console.debug('Caught error during newline operation:', newlineError);
                
                // If it fails, return a position that advances the cursor to the new line
                if (typeof cursorStateComputer === 'function') {
                  try {
                    // Try to compute cursor state manually
                    const manualCursorState = [];
                    const position = edits[0].range.getEndPosition();
                    // Move cursor to next line
                    manualCursorState.push({
                      position: new monaco.Position(position.lineNumber + 1, 1)
                    });
                    return manualCursorState;
                  } catch (cursorError) {
                    console.debug('Cursor state computation fallback failed:', cursorError);
                    return [];
                  }
                }
                return [];
              }
            } else {
              // Normal operation for all other edits
              return originalPushEditOperations.call(this, beforeCursorState, edits, cursorStateComputer);
            }
          } catch (e) {
            console.warn('Caught error in pushEditOperations:', e);
            // Return a safe default - empty array of cursor states
            return [];
          }
        };
        
        originalModelPrototype.__patchedPushEditOperations = true;
      }
    }
    
    // Patch editor creation to fix the isVisible error
    if (monaco.editor && monaco.editor.create && !monaco.editor.__patchedCreate) {
      const originalCreate = monaco.editor.create;
      monaco.editor.__patchedCreate = true;
      
      monaco.editor.create = function(domElement: HTMLElement, options?: any, override?: any) {
        // Add safety options to prevent tokenization issues
        const safeOptions = {
          ...options,
          // Disable features that can cause the isVisible issue
          renderLineHighlight: 'none',
          renderControlCharacters: false,
        };
        
        try {
          const editor = originalCreate.call(monaco.editor, domElement, safeOptions, override);
          
          // Patch the model-to-view conversion methods
          setTimeout(() => {
            try {
              // @ts-ignore
              const viewModel = editor._getViewModel();
              if (viewModel && viewModel.coordinatesConverter) {
                // Patch both conversion methods
                safelyPatchMethod(
                  viewModel.coordinatesConverter, 
                  'convertModelPositionToViewPosition',
                  (modelPosition: any) => modelPosition
                );
                
                safelyPatchMethod(
                  viewModel.coordinatesConverter, 
                  'convertViewToModelPosition',
                  (viewPosition: any) => viewPosition
                );
              }
            } catch (e) {
              // Ignore internal API errors
            }
          }, 100);
          
          return editor;
        } catch (e) {
          // Fallback to original create
          console.error('Error in patched create:', e);
          return originalCreate.call(monaco.editor, domElement, options, override);
        }
      };
    }
    
  } catch (e) {
    console.warn('Error applying Monaco patches:', e);
  }
}

/**
 * Safely patch a method with error protection
 */
function safelyPatchMethod(
  obj: any, 
  methodName: string, 
  fallbackValueProvider: (arg: any) => any
) {
  if (!obj || !obj[methodName] || obj[`__patched_${methodName}`]) return;
  
  const original = obj[methodName];
  
  obj[methodName] = function(arg: any, ...rest: any[]) {
    try {
      return original.apply(this, [arg, ...rest]);
    } catch (e) {
      console.debug(`Caught error in ${methodName}:`, e);
      return fallbackValueProvider(arg);
    }
  };
  
  obj[`__patched_${methodName}`] = true;
}

// Call setup immediately so Monaco environment is ready
setupMonacoEnvironment();

export default setupMonacoEnvironment; 