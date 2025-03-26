// Main components
export { default } from './FileEditor';
export { default as FileEditor } from './FileEditor';
export { default as EditorTest } from './EditorTest';

// Hooks and utilities
export { useFileEditor } from './FileEditorHooks';
export { 
  handleFileTabSwitch, 
  handleContentChange, 
  handleCloseTab 
} from './EditorEventHandlers';
export { setupFileEventListeners } from './EditorEventListeners';
export { safelyDetachModel, preventCanceledErrors } from './EditorCleanup';
export { modelManager, EditorModelManager } from './EditorModelManager';

// Sub-components
export { default as MonacoEditorComponent } from './MonacoEditorComponent';
export { default as MonacoEditor } from './MonacoEditor';
export { default as EditorManager } from './EditorManager';
export { default as ScriptEditorPanel } from './ScriptEditorPanel';

// Types
export type { 
  OpenedFile,
  TabModelData,
  EditorConfig
} from './types';
export type { EditorFile } from './EditorManager';

// Event types
export type { 
  FileRefreshEvent, 
  FileOpenedEvent, 
  FileSwitchEvent 
} from './EditorEventListeners'; 