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
    
    // Add global error handler for Monaco-related errors
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if error is related to Monaco Editor
      if (source?.includes('monaco') || message?.toString().includes('V is not iterable')) {
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

// Call setup immediately so Monaco environment is ready
setupMonacoEnvironment();

export default setupMonacoEnvironment; 