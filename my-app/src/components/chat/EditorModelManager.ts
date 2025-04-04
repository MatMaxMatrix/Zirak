import * as monaco from 'monaco-editor';
import setupMonacoEnvironment from '../../utils/monaco-config';

// Call setup function to configure Monaco environment
setupMonacoEnvironment();

/**
 * Manages Monaco editor models across component lifecycles
 */
export class EditorModelManager {
  // Map to store models for each tab
  private tabModels: Map<string, monaco.editor.ITextModel> = new Map();
  
  // Map to store view states for each tab
  private tabViewStates: Map<string, monaco.editor.ICodeEditorViewState | null> = new Map();
  
  // Map to store scroll positions
  private tabScrollPositions: Map<string, { scrollTop: number; scrollLeft: number }> = new Map();

  // Active tab path
  private activeTabPath: string | null = null;
  
  // Track if Monaco is initialized
  private isMonacoInitialized = false;

  constructor() {
    this.initializeMonaco();
  }

  /**
   * Ensure Monaco is properly initialized
   */
  private async initializeMonaco(): Promise<void> {
    if (this.isMonacoInitialized) return;
    
    try {
      // Ensure the environment is set up
      setupMonacoEnvironment();
      
      // Set initialized flag
      this.isMonacoInitialized = true;
    } catch (error) {
      console.error('Error initializing Monaco:', error);
    }
  }
  
  /**
   * Register a tab with a model or creates a new one
   */
  public registerTab(path: string, content: string, language: string): monaco.editor.ITextModel {
    try {
      // Ensure Monaco is initialized
      if (!this.isMonacoInitialized) {
        this.initializeMonaco();
      }
      
      // Check if model already exists for this tab
      let model = this.tabModels.get(path);
      
      if (!model) {
        // Create a new model if none exists
        const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
        let uri;
        
        try {
          uri = monaco.Uri.parse(`file:///${normalizedPath}`);
        } catch (error) {
          console.error('Error parsing URI:', error);
          // Fallback to a simple URI
          uri = monaco.Uri.parse(`file:///fallback/${Date.now()}`);
        }

        // Check if a model with this URI already exists
        const existingModel = monaco.editor.getModel(uri);
        if (existingModel) {
          // Use the existing model
          model = existingModel;
          // For safety, update in a try/catch
          try {
            this.safeSetModelValue(existingModel, content);
          } catch (error) {
            console.error('Error updating existing model:', error);
          }
        } else {
          // Create an empty model first
          model = monaco.editor.createModel('', language, uri);
          
          // Set content with a small delay to avoid "V is not iterable" error
          if (content) {
            // Use a microtask to update content
            Promise.resolve().then(() => {
              if (model) {
                try {
                  this.safeSetModelValue(model, content);
                } catch (error) {
                  console.error('Error setting model content:', error);
                }
              }
            });
          }
        }
        
        this.tabModels.set(path, model);
      } else if (model.getValue() !== content) {
        // Update existing model with new content
        // Use safer setValue method instead of edit operations for reliability
        try {
          this.safeSetModelValue(model, content);
        } catch (error) {
          console.error('Error updating model content:', error);
        }
      }
      
      return model;
    } catch (error) {
      console.error('Error in registerTab:', error);
      // Return a minimal fallback model if all else fails
      try {
        const fallbackUri = monaco.Uri.parse(`file:///error-fallback/${Date.now()}`);
        const fallbackModel = monaco.editor.createModel('', 'plaintext', fallbackUri);
        return fallbackModel;
      } catch (fallbackError) {
        console.error('Failed to create fallback model:', fallbackError);
        throw new Error('Unable to create editor model');
      }
    }
  }
  
  /**
   * Safely set the value of a model, avoiding common errors
   */
  private safeSetModelValue(model: monaco.editor.ITextModel, content: string): void {
    if (!model || model.isDisposed()) return;
    
    try {
      // Prefer the safer model.setValue() over pushEditOperations
      model.setValue(content);
    } catch (error) {
      console.error('Error in standard setValue, trying alternate approach:', error);
      
      try {
        // Fallback to fully replacing the entire content
        // This avoids the "V is not iterable" error that can occur with complex edits
        const fullRange = model.getFullModelRange();
        
        // Use editor.executeEdits with most basic edit operations
        const basicEditOperation = {
          range: fullRange,
          text: content,
          forceMoveMarkers: true
        };
        
        // @ts-ignore - Using internal method as fallback
        model.pushEditOperations([], [basicEditOperation], () => null);
      } catch (fallbackError) {
        console.error('Error in fallback edit operation:', fallbackError);
        
        // Try one more approach with direct setting using setTimeout
        setTimeout(() => {
          try {
            if (model && !model.isDisposed()) {
              model.setValue(content);
            }
          } catch (finalError) {
            console.error('All setValue approaches failed:', finalError);
          }
        }, 0);
      }
    }
  }
  
  /**
   * Activate a tab
   */
  public activateTab(path: string): void {
    this.activeTabPath = path;
  }

  /**
   * Get the active tab path
   */
  public getActiveTab(): string | null {
    return this.activeTabPath;
  }
  
  /**
   * Get tab model, creating it if it doesn't exist
   */
  public getTabModel(path: string, content?: string, language?: string): { 
    model: monaco.editor.ITextModel | null; 
    viewState: monaco.editor.ICodeEditorViewState | null;
    scroll: { scrollTop: number; scrollLeft: number } | null;
  } {
    try {
      // If we have content and language, we want to register or update the model
      if (content !== undefined && language !== undefined) {
        const model = this.registerTab(path, content, language);
        return {
          model,
          viewState: this.tabViewStates.get(path) || null,
          scroll: this.tabScrollPositions.get(path) || null
        };
      }
      
      // Otherwise just return the existing model if any
      const model = this.tabModels.get(path) || null;
      return {
        model,
        viewState: this.tabViewStates.get(path) || null,
        scroll: this.tabScrollPositions.get(path) || null
      };
    } catch (error) {
      console.error('Error in getTabModel:', error);
      return {
        model: null,
        viewState: null,
        scroll: null
      };
    }
  }
  
  /**
   * Update tab content without changing its model
   */
  public updateTabContent(path: string, content: string): void {
    try {
      const model = this.tabModels.get(path);
      if (!model) return;
      
      if (model.getValue() !== content) {
        // Use our safe method for setting values
        this.safeSetModelValue(model, content);
      }
    } catch (error) {
      console.error('Error in updateTabContent:', error);
    }
  }
  
  /**
   * Save view state for a tab
   */
  public saveTabViewState(
    path: string, 
    viewState: monaco.editor.ICodeEditorViewState | null, 
    scroll?: { scrollTop: number; scrollLeft: number },
    content?: string
  ): void {
    try {
      // Save view state
      this.tabViewStates.set(path, viewState);
      
      // Save scroll position if provided
      if (scroll) {
        this.tabScrollPositions.set(path, scroll);
      }
      
      // Update content if provided
      if (content !== undefined) {
        this.updateTabContent(path, content);
      }
    } catch (error) {
      console.error('Error in saveTabViewState:', error);
    }
  }
  
  /**
   * Get saved view state for a tab
   */
  public getViewState(path: string): monaco.editor.ICodeEditorViewState | null {
    try {
      return this.tabViewStates.get(path) || null;
    } catch (error) {
      console.error('Error in getViewState:', error);
      return null;
    }
  }
  
  /**
   * Dispose of a tab's model
   */
  public disposeTabModel(path: string): void {
    try {
      const model = this.tabModels.get(path);
      if (model) {
        // Ensure model is still valid before disposing
        if (!model.isDisposed()) {
          model.dispose();
        }
        this.tabModels.delete(path);
        this.tabViewStates.delete(path);
        this.tabScrollPositions.delete(path);
      }
    } catch (error) {
      console.error('Error in disposeTabModel:', error);
      // Still attempt to clean up
      this.tabModels.delete(path);
      this.tabViewStates.delete(path);
      this.tabScrollPositions.delete(path);
    }
  }
  
  /**
   * Clean up all tab models
   */
  public dispose(): void {
    try {
      // Dispose all models
      this.tabModels.forEach(model => {
        try {
          if (!model.isDisposed()) {
            model.dispose();
          }
        } catch (error) {
          console.error('Error disposing model:', error);
        }
      });
      
      // Clear maps
      this.tabModels.clear();
      this.tabViewStates.clear();
      this.tabScrollPositions.clear();
      this.activeTabPath = null;
    } catch (error) {
      console.error('Error in dispose:', error);
    }
  }
}

// Export a singleton instance of the manager for global use
export const modelManager = new EditorModelManager(); 