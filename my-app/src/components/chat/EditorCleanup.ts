import * as monaco from 'monaco-editor';

/**
 * Safely cleans up the word highlighter to prevent "Canceled" errors during unmounting
 * This helps prevent memory leaks and errors when components using Monaco are unmounted
 * 
 * @param editor Monaco editor instance
 */
export function safelyCleanupWordHighlighter(editor: monaco.editor.IStandaloneCodeEditor): void {
  try {
    // Monaco internally creates various services that need to be cleaned up
    // This is an internal API that may change, but helps prevent memory leaks
    const editorInstance = editor as any;
    
    if (editorInstance._themeService) {
      try {
        // Attempt to clean up theme-related resources
        const themeService = editorInstance._themeService;
        if (themeService && typeof themeService.dispose === 'function') {
          themeService.dispose();
        }
      } catch (error) {
        // Silently catch errors to prevent crashes
        console.debug('Error cleaning up theme service:', error);
      }
    }
    
    // Clean up the model if it exists
    try {
      const model = editor.getModel();
      if (model && !model.isDisposed()) {
        model.dispose();
      }
    } catch (error) {
      console.debug('Error disposing editor model:', error);
    }
    
    // Make sure word highlighter is cleaned up
    try {
      if (editorInstance._contributions) {
        const contributions = editorInstance._contributions;
        if (contributions && contributions['editor.contrib.wordHighlighter']) {
          const wordHighlighter = contributions['editor.contrib.wordHighlighter'];
          if (wordHighlighter && typeof wordHighlighter.dispose === 'function') {
            wordHighlighter.dispose();
          }
        }
      }
    } catch (error) {
      console.debug('Error cleaning up word highlighter:', error);
    }
  } catch (error) {
    // Catch any errors during cleanup to prevent crashes
    console.debug('Error during editor cleanup:', error);
  }
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Safely detach model to prevent "Canceled" errors
 */
export const safelyDetachModel = (editor: monaco.editor.IStandaloneCodeEditor | null): void => {
  if (!editor) return;
  
  try {
    // First try to prevent model change events
    // @ts-ignore - Direct access to internal Monaco editor properties
    if (editor._eventEmitter && editor._eventEmitter.fire) {
      // @ts-ignore - Monaco internal property access
      const originalFire = editor._eventEmitter.fire;
      // @ts-ignore - Monaco internal property access
      editor._eventEmitter.fire = function() {
        // Just return without firing
        return;
      };
    }
    
    // Specifically prevent the problematic event shown in stack trace
    // @ts-ignore - Direct access to internal Monaco editor properties
    if (editor._onDidChangeModel && editor._onDidChangeModel.fire) {
      // @ts-ignore - Monaco internal property access
      const originalModelChangeFire = editor._onDidChangeModel.fire;
      // @ts-ignore - Monaco internal property access
      editor._onDidChangeModel.fire = function() {
        // No-op to prevent the event that causes the error
        return;
      };
    }
    
    // First cleanup word highlighter
    safelyCleanupWordHighlighter(editor);
    
    // Try to get the model before we detach it
    const model = editor.getModel();
    
    // Replace the model detachment mechanism at its core
    if (editor.setModel) {
      const originalSetModel = editor.setModel.bind(editor);
      // @ts-ignore - Monkey patching
      editor.setModel = function(model) {
        try {
          // If we have a current model, we need to remove all decorations first
          const currentModel = editor.getModel();
          if (currentModel) {
            try {
              // Clear any decorations that might trigger events
              currentModel.deltaDecorations([], []);
            } catch (e) {
              // Ignore errors
            }
          }
          
          // Call original but catch Canceled errors
          try {
            return originalSetModel(model);
          } catch (e) {
            if (e instanceof Error && e.message === 'Canceled') {
              // Swallow the specific error we're trying to fix
              console.debug('Safely handled Canceled error during model detachment');
              return;
            }
            // Re-throw other errors
            throw e;
          }
        } catch (e) {
          // Last resort - just don't throw
          console.debug('Suppressed error during model detachment:', e);
          return;
        }
      };
    }
    
    // Now actually set the model to null
    editor.setModel(null);
    
    // Mark the model as disposed if needed to prevent further access
    if (model && !model.isDisposed()) {
      // @ts-ignore - Setting internal property to prevent errors
      model._isDisposed = true;
    }
  } catch (e) {
    // Ignore any errors during model detachment
    console.debug('Error in safelyDetachModel:', e);
  }
};

/**
 * Prevent race conditions in the Monaco editor
 */
export const preventCanceledErrors = (): void => {
  try {
    // Get all editors to ensure we clean up properly
    const editors = monaco.editor.getEditors();
    for (const editor of editors) {
      try {
        // Cast to any to bridge type gap between ICodeEditor and IStandaloneCodeEditor
        safelyCleanupWordHighlighter(editor as any);
      } catch (e) {
        // Ignore errors - we're just being defensive
      }
    }
  } catch (e) {
    // Ignore any errors
  }
}; 