import { WorkspaceProps } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal as TerminalIcon, FolderOpen, FolderClosed, ChevronLeft, ChevronRight, X, Trash2, Copy } from "lucide-react";
import { WorkflowDisplay } from "./WorkflowDisplay";
import { FileExplorer } from "./FileExplorer";
import { FileViewer } from "./FileViewer";
import { Terminal } from "./Terminal";
import { FileEditor } from "./FileEditor";
import { ResizeHandle } from "./ResizeHandle";
import { ProjectSelector } from "./ProjectSelector";
import { useState, useRef, useEffect } from "react";
import { FileSystem, Project } from "@/types/chat";
import { ProjectConfigModal } from "./ProjectConfigModal";
import { Preview } from "./Preview";
import { useResizing } from "@/hooks/useResizing";

export function Workspace({
  activeTab,
  setActiveTab,
  showWorkspace,
  setShowWorkspace,
  width,
  fileSystem,
  selectedFile,
  workflowSteps,
  setSelectedFile,
  toggleDirectory,
  terminal,
  showWelcomeMessage,
  workingDirectory,
  showTerminal,
  setShowTerminal,
  editingFile,
  fileContent,
  filePath,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  terminalInput,
  setTerminalInput,
  terminalProcessing,
  completions,
  showCompletions,
  selectedCompletion,
  selectCompletion,
  setShowCompletions,
  setSelectedCompletion,
  executeTerminalCommand,
  copiedText,
  copyTerminalContent,
  clearTerminal,
  refreshFileSystem,
  terminalInputRef,
  terminalEndRef,
  fileEditorRef,
  workflowEndRef,
  previewUrl,
  isPreviewLoading,
  openFile
}: WorkspaceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState('');
  const [currentFileContent, setCurrentFileContent] = useState('');
  const [minimizedPanel, setMinimizedPanel] = useState<'none' | 'fileExplorer' | 'chat' | 'preview'>('none');
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectConfig, setShowProjectConfig] = useState(false);

  // Get resize handlers and state from custom hook
  const { 
    workspaceWidth,
    setWorkspaceWidth,
    fileExplorerWidth, 
    setFileExplorerWidth,
    terminalHeight,
    setTerminalHeight,
    editorHeight,
    setEditorHeight,
    handleHorizontalMouseDown,
    handleFileExplorerResize,
    handleTerminalMouseDown,
    handleEditorMouseDown,
    terminalRef,
    editorRef
  } = useResizing();

  // Extract the project from fileSystem to avoid TypeScript errors
  const currentProject = Array.isArray(fileSystem) && fileSystem.length > 0 
    ? (fileSystem[0] as any)?.project 
    : null;

  // Function to select a file to view its contents
  const selectFile = async (file: any) => {
    if (file.type === 'file') {
      console.log('Selecting file:', file);
      setSelectedFile(file);
      setActiveTab('editor');
      
      // If we have an external openFile function, use it
      if (typeof openFile === 'function') {
        const filePath = file.path.startsWith('/project/') ? file.path : `/project/${file.path}`;
        console.log('Opening file using openFile function:', filePath);
        const success = await openFile(filePath);
        
        if (!success) {
          console.error('Failed to open file using openFile function');
        }
        
        return;
      }
      
      try {
        // Ensure the file path is properly formatted
        const filePath = file.path.startsWith('/project/') ? file.path : `/project/${file.path}`;
        
        console.log('Loading file:', filePath);
        
        const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.file) {
          console.log('File content loaded:', { path: data.file.path, contentLength: data.file.content.length });
          
          // When using external editing (editingFile prop), pass content to parent components
          if (typeof setFileContent === 'function') {
            console.log("Using external file content state");
            setFileContent(data.file.content);
            // If we have a function to start editing mode externally
            if (typeof saveFileContent === 'function') {
              // This might trigger the parent component's editing state
              file.content = data.file.content;
            }
          } else {
            // Use internal state management
            setCurrentFileContent(data.file.content);
            setCurrentFilePath(data.file.path);
            setIsEditing(true);
            
            // Update the selected file's content
            file.content = data.file.content;
          }
          
          console.log('State updated with file content');
        } else {
          throw new Error('Invalid file data received');
        }
      } catch (error) {
        console.error('Failed to load file content:', error);
        window.alert(`Failed to load file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
  
  // Close the terminal panel
  const closeTerminal = () => {
    setShowTerminal(false);
  };
  
  // Function to handle file editing
  const handleEditFile = async (file: any) => {
    try {
      // Ensure the file path is properly formatted
      const filePath = file.path.startsWith('/project/') ? file.path : `/project/${file.path}`;
      
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.file) {
        // We got a direct file response
        setCurrentFileContent(data.file.content);
        setCurrentFilePath(data.file.path);
        setIsEditing(true);
      } else if (data.fileSystem && data.fileSystem.length > 0) {
        // Find the file in the fileSystem array
        const findFile = (items: any[]): any => {
          for (const item of items) {
            if (item.path === filePath) {
              return item;
            }
            if (item.children) {
              const found = findFile(item.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const fileItem = findFile(data.fileSystem);
        if (fileItem && fileItem.content !== undefined) {
          setCurrentFileContent(fileItem.content);
          setCurrentFilePath(fileItem.path);
          setIsEditing(true);
        } else {
          throw new Error('File content not found');
        }
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  };

  // Function to handle file saving
  const handleSaveFile = async () => {
    try {
      if (!selectedFile) {
        throw new Error('No file selected');
      }

      // Ensure the file path is properly formatted
      const filePath = selectedFile.path.startsWith('/project/') 
        ? selectedFile.path 
        : `/project/${selectedFile.path}`;
      
      // Get the current content
      const content = currentFileContent;
      
      if (content === undefined || content === null) {
        throw new Error('No content to save');
      }

      console.log('Saving file:', { filePath, contentLength: content.length });

      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          path: filePath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }

      // After successful save, fetch the latest file content
      const getResponse = await fetch(`/api/filesystem?path=${encodeURIComponent(filePath)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Error refreshing file content: ${getResponse.status}`);
      }

      const data = await getResponse.json();
      if (data.file) {
        setCurrentFileContent(data.file.content);
        // Update the selected file's content
        if (selectedFile) {
          selectedFile.content = data.file.content;
        }
      }
      
      // Refresh the file system to show updated content
      await refreshFileSystem();
      
      console.log('File saved successfully');
      
    } catch (error) {
      console.error('Failed to save file:', error);
      window.alert(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Function to handle canceling file editing
  const handleCancelEditing = () => {
    setIsEditing(false);
    setCurrentFileContent('');
    setCurrentFilePath('');
    setSelectedFile(null);
    setActiveTab('workflow');
  };

  // Function to handle panel minimization
  const handleMinimizePanel = (panel: 'fileExplorer' | 'chat' | 'preview') => {
    setMinimizedPanel(panel);
  };

  // Function to handle panel maximization
  const handleMaximizePanel = () => {
    setMinimizedPanel('none');
  };

  // Function to handle project selection
  const handleProjectSelect = async (project: Project) => {
    console.log('Selecting project:', project);
    const updatedProject = {
      id: project.name,
      name: project.name,
      path: project.path.startsWith('/project/') ? project.path : `/project/${project.name}`,
      lastAccessed: new Date().toISOString(),
      config: {
        description: project.config?.description || `Project ${project.name}`,
        type: project.config?.type || 'web',
        language: project.config?.language || 'typescript',
        framework: project.config?.framework
      }
    };
    setSelectedFile(null);
    setIsEditing(false);
    setCurrentFileContent('');
    setCurrentFilePath('');

    try {
      // Update working directory in terminal
      await executeTerminalCommand(`cd ${project.name}\r`);
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error switching project:', error);
    }
  };

  // Function to execute terminal commands
  const handleExecuteTerminalCommand = async (command: string) => {
    try {
      // Execute the command
      await executeTerminalCommand(command.trim());
      
      // Check if the command modifies the file system
      const fileSystemCommands = ['mkdir', 'touch', 'rm', 'mv', 'cp', 'echo', '>', '>>', 'cat', 'git'];
      const isFileSystemCommand = fileSystemCommands.some(cmd => command.toLowerCase().trim().startsWith(cmd));
      
      // Refresh file system if it's a file system command
      if (isFileSystemCommand) {
        try {
          await refreshFileSystem();
        } catch (error) {
          console.error('Error refreshing file system:', error);
          // If the first attempt fails, try again after a short delay
          setTimeout(async () => {
            try {
              await refreshFileSystem();
            } catch (retryError) {
              console.error('Error refreshing file system after retry:', retryError);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error executing terminal command:', error);
    }
  };

  const handleCreateProject = async (project: Project) => {
    console.log('Creating new project:', project);
    const updatedProject = {
      id: project.name,
      name: project.name,
      path: project.path.startsWith('/project/') ? project.path : `/project/${project.name}`,
      lastAccessed: new Date().toISOString(),
      config: {
        description: project.config?.description || `Project ${project.name}`,
        type: project.config?.type || 'web',
        language: project.config?.language || 'typescript',
        framework: project.config?.framework
      }
    };
    setIsCreating(false);
    setSelectedFile(null);
    setIsEditing(false);
    setCurrentFileContent('');
    setCurrentFilePath('');

    try {
      // Update working directory in terminal
      await executeTerminalCommand(`cd ${project.path}\r`);
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleTerminalToggle = () => {
    if (!showTerminal) {
      // Open terminal - use either 25% of the viewport height or the previous height if it was set
      const viewportHeight = window.innerHeight;
      const initialHeight = Math.round(viewportHeight * 0.25);
      const newHeight = terminalHeight > 5 ? terminalHeight : initialHeight;
      setShowTerminal(true);
      setTerminalHeight(newHeight);
    } else {
      // Close terminal
      setShowTerminal(false);
    }
  };

  const handleOpenProjectConfig = () => {
    setShowProjectConfig(true);
  };

  const handleSaveProjectConfig = (updatedProject: Project) => {
    setShowProjectConfig(false);
  };

  // Debug logging
  useEffect(() => {
    console.log('Workspace state updated - isEditing:', isEditing, 'editingFile:', editingFile, 'selectedFile:', selectedFile?.path);
  }, [isEditing, editingFile, selectedFile]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + Workspace Toggle */}
      <div className="flex bg-[#1A1A1A] border-b border-[#2A2A2A] justify-between items-center h-8">
        <div className="flex h-full">
          <button
            className={`px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'workflow' 
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('workflow')}
          >
            Workflow
          </button>
          <button
            className={`px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'editor' 
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button
            className={`px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'preview' 
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
        
        {showProjectConfig && (
          <ProjectConfigModal
            project={currentProject}
            onClose={() => setShowProjectConfig(false)}
            onSave={handleSaveProjectConfig}
          />
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowWorkspace(false)}
          className="h-6 w-6 mr-1"
          title="Hide Workspace"
        >
          <ChevronLeft size={14} />
        </Button>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-auto bg-[#121212] p-2">
              <WorkflowDisplay 
                workflowSteps={workflowSteps || []}
                workflowEndRef={workflowEndRef}
              />
            </div>
          </div>
        )}
        
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="flex flex-row h-full">
            {/* File Explorer */}
            <div 
              className="flex flex-col border-r border-[#2A2A2A] bg-[#181818] overflow-auto"
              style={{ width: `${fileExplorerWidth}%`, minWidth: '200px', maxWidth: '40%' }}
            >
              <FileExplorer 
                fileSystem={fileSystem}
                selectedFile={selectedFile}
                onSelectFile={selectFile}
                onToggleDirectory={toggleDirectory}
                workingDirectory={workingDirectory}
                onRefresh={refreshFileSystem}
              />
              
              {/* File Explorer resize handle */}
              <div
                className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize bg-[#2A2A2A] hover:bg-blue-500 transition-colors"
                onMouseDown={handleFileExplorerResize}
              />
            </div>

            {/* File content area */}
            <div 
              className="flex-1 flex flex-col overflow-hidden bg-[#121212]"
              style={{ width: `${100 - fileExplorerWidth}%` }}
            >
              {editingFile || isEditing ? (
                <FileEditor 
                  fileContent={editingFile ? fileContent : currentFileContent}
                  setFileContent={editingFile ? setFileContent : setCurrentFileContent}
                  saveFileContent={editingFile ? saveFileContent : handleSaveFile}
                  cancelFileEditing={editingFile ? cancelFileEditing : handleCancelEditing}
                  filePath={editingFile ? filePath : currentFilePath}
                  fileEditorRef={fileEditorRef}
                />
              ) : selectedFile ? (
                <FileViewer 
                  content={selectedFile.content || ''} 
                  filePath={selectedFile.path}
                  onEdit={() => handleEditFile(selectedFile)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FolderOpen className="mx-auto h-12 w-12 opacity-50 mb-2" />
                    <p>Select a file to view its content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <Preview url={previewUrl || ''} isLoading={isPreviewLoading} />
        )}
        
        {/* Terminal Panel */}
        {showTerminal && (
          <>
            <ResizeHandle
              direction="vertical"
              onMouseDown={handleTerminalMouseDown}
            />
            <div 
              className="border-t border-[#2A2A2A] bg-[#1A1A1A]"
              style={{ height: `${terminalHeight}%`, minHeight: '10%', maxHeight: '60%' }}
            >
              <div className="flex items-center justify-between p-1 bg-[#212121] border-b border-[#2A2A2A]">
                <div className="text-xs font-medium text-gray-400 px-2">Terminal</div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={copyTerminalContent}
                    title="Copy Terminal Content"
                  >
                    <Copy size={13} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={clearTerminal}
                    title="Clear Terminal"
                  >
                    <Trash2 size={13} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowTerminal(false)}
                    title="Close Terminal"
                  >
                    <X size={13} />
                  </Button>
                </div>
              </div>
              <Terminal 
                terminal={terminal}
                showWelcomeMessage={showWelcomeMessage}
                input={terminalInput}
                setInput={setTerminalInput}
                isProcessing={terminalProcessing}
                onSendCommand={handleExecuteTerminalCommand}
                workingDirectory={workingDirectory}
                completions={completions}
                showCompletions={showCompletions}
                selectedCompletion={selectedCompletion}
                onSelectCompletion={selectCompletion}
                setShowCompletions={setShowCompletions}
                setSelectedCompletion={setSelectedCompletion}
                terminalInputRef={terminalInputRef}
                terminalEndRef={terminalEndRef}
                copiedText={copiedText}
                copyTerminalContent={copyTerminalContent}
                clearTerminal={clearTerminal}
                refreshFileSystem={refreshFileSystem}
                closeTerminal={closeTerminal}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
} 