// Import everything from the index.ts file to verify exports
import { FileEditor, EditorTest, useFileEditor, modelManager } from './';

// This file is just for testing exports, no actual code is needed
export const testFunction = () => {
  console.log('FileEditor import successful:', FileEditor !== undefined);
  console.log('EditorTest import successful:', EditorTest !== undefined);
  console.log('useFileEditor import successful:', useFileEditor !== undefined);
  console.log('modelManager import successful:', modelManager !== undefined);
}; 