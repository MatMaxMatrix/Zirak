'use client';

import React, { useState } from 'react';
import { Workspace } from './Workspace';

export function Chat() {
  const [fileExplorerWidth, setFileExplorerWidth] = useState(250);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const startX = e.clientX;
    const startWidth = fileExplorerWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, startWidth + (e.clientX - startX));
      setFileExplorerWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <div className="flex h-full">
      <Workspace
        activeTab="editor"
        setActiveTab={() => {}}
        showWorkspace={true}
        setShowWorkspace={() => {}}
        width={700}
        handleHorizontalMouseDown={() => {}}
        fileSystem={[]}
        selectedFile={null}
        workflowSteps={[]}
        setSelectedFile={() => {}}
        toggleDirectory={() => {}}
        terminal={[]}
        showWelcomeMessage={false}
        workingDirectory="/"
        showTerminal={false}
        setShowTerminal={() => {}}
        editingFile={false}
        fileContent=""
        filePath=""
        setFileContent={() => {}}
        saveFileContent={() => {}}
        cancelFileEditing={() => {}}
        terminalInput=""
        setTerminalInput={() => {}}
        terminalProcessing={false}
        completions={[]}
        showCompletions={false}
        selectedCompletion={0}
        selectCompletion={() => {}}
        setShowCompletions={() => {}}
        setSelectedCompletion={() => {}}
        executeTerminalCommand={async () => {}}
        copiedText=""
        copyTerminalContent={() => {}}
        clearTerminal={() => {}}
        refreshFileSystem={async () => {}}
        terminalInputRef={null}
        terminalEndRef={null}
        fileEditorRef={null}
        workflowEndRef={null}
        fileExplorerWidth={250}
        handleFileExplorerResize={() => {}}
        previewUrl={previewUrl}
        isPreviewLoading={isPreviewLoading}
      />
    </div>
  );
} 