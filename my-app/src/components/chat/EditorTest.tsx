import React, { useState } from 'react';
import { useFileEditor } from './FileEditorHooks';
import { modelManager } from './EditorModelManager';
import * as monaco from 'monaco-editor';

/**
 * Test component for the file editor functionality
 */
const EditorTest: React.FC = () => {
  const {
    openedFiles,
    activeFilePath,
    fileContent,
    hasUnsavedChanges,
    editorRef,
    openFile,
    handleFileTabSwitch,
    handleEditorDidMount
  } = useFileEditor();

  const [testFiles] = useState([
    { path: 'test/file1.js', content: 'console.log("File 1");' },
    { path: 'test/file2.js', content: 'console.log("File 2");' },
    { path: 'test/file3.js', content: 'console.log("File 3");' }
  ]);

  const createTestEditor = (container: HTMLElement | null) => {
    if (!container) return;
    
    const editor = monaco.editor.create(container, {
      value: fileContent,
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true
    });
    
    handleEditorDidMount(editor);
  };

  return (
    <div className="editor-test">
      <h2>Editor Test</h2>
      
      <div className="file-tabs">
        {openedFiles.map(file => (
          <button
            key={file.path}
            onClick={() => handleFileTabSwitch(file.path)}
            className={activeFilePath === file.path ? 'active' : ''}
          >
            {file.path.split('/').pop()}
            {file.hasUnsavedChanges ? '*' : ''}
          </button>
        ))}
      </div>
      
      <div className="test-actions">
        <h3>Test Files:</h3>
        {testFiles.map(file => (
          <button key={file.path} onClick={() => openFile(file.path)}>
            Open {file.path}
          </button>
        ))}
      </div>
      
      <div 
        className="monaco-editor-container" 
        style={{ height: '400px', width: '100%' }}
        ref={createTestEditor}
      />
      
      <div className="status-bar">
        <span>Active File: {activeFilePath || 'None'}</span>
        <span>Status: {hasUnsavedChanges ? 'Unsaved Changes' : 'Saved'}</span>
        <span>Model Count: {modelManager.getActiveTab() ? '1' : '0'}</span>
      </div>
    </div>
  );
};

export default EditorTest; 