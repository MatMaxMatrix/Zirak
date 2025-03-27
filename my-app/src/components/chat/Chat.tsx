import { useState } from 'react';
import { Workspace } from './Workspace';

export function Chat() {
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflow' | 'editor' | 'preview'>('workflow');
  const [workspaceWidth, setWorkspaceWidth] = useState(70);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = workspaceWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.pageX - startX;
      const newWidth = Math.min(Math.max(startWidth + (deltaX / window.innerWidth) * 100, 30), 90);
      setWorkspaceWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex h-screen bg-[#0C0C0C]">
      <Workspace
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showWorkspace={showWorkspace}
        setShowWorkspace={setShowWorkspace}
        width={workspaceWidth}
        handleHorizontalMouseDown={handleHorizontalMouseDown}
        fileSystem={[]}
        selectedFile={null}
        workflowSteps={[]}
        setSelectedFile={() => {}}
        toggleDirectory={() => {}}
        terminal={[]}
        showWelcomeMessage={false}
        workingDirectory=""
        showTerminal={false}
        setShowTerminal={() => {}}
        terminalHeight={300}
        handleTerminalMouseDown={() => {}}
        editingFile={false}
        fileContent=""
        filePath=""
        setFileContent={() => {}}
        saveFileContent={async () => {}}
        cancelFileEditing={() => {}}
        editorHeight={300}
        handleEditorMouseDown={() => {}}
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
        terminalInputRef={{ current: null }}
        terminalEndRef={{ current: null }}
        fileEditorRef={{ current: null }}
        workflowEndRef={{ current: null }}
        fileExplorerWidth={250}
        handleFileExplorerResize={() => {}}
        previewUrl={previewUrl}
        isPreviewLoading={isPreviewLoading}
      />
    </div>
  );
} 