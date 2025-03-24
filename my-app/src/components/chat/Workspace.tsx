import { WorkspaceProps } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal as TerminalIcon } from "lucide-react";
import { WorkflowDisplay } from "./WorkflowDisplay";
import { FileExplorer } from "./FileExplorer";
import { FileViewer } from "./FileViewer";
import { Terminal } from "./Terminal";
import { FileEditor } from "./FileEditor";
import { ResizeHandle } from "./ResizeHandle";

export function Workspace({
  activeTab,
  setActiveTab,
  showWorkspace,
  setShowWorkspace,
  width,
  handleHorizontalMouseDown,
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
  terminalHeight,
  handleTerminalMouseDown,
  editingFile,
  fileContent,
  filePath,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  editorHeight,
  handleEditorMouseDown,
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
  workflowEndRef
}: WorkspaceProps) {
  // Function to select a file to view its contents
  const selectFile = (file: any) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setActiveTab('editor');
    }
  };
  
  // Close the terminal panel
  const closeTerminal = () => {
    setShowTerminal(false);
  };
  
  return (
    <div 
      className="flex flex-col relative workspace-container"
      style={{ width: `${width}%` }}
    >
      <div className="flex items-center p-2 border-b bg-muted/30">
        <div className="flex-1 grid grid-cols-3 gap-1 bg-muted rounded-md p-0.5">
          <button
            className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
              activeTab === 'workflow' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
            }`}
            onClick={() => setActiveTab('workflow')}
          >
            Workflow
          </button>
          <button
            className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
              activeTab === 'files' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
            }`}
            onClick={() => setActiveTab('files')}
          >
            Files
          </button>
          <button
            className={`text-xs py-1.5 px-2 rounded-sm font-medium ${
              activeTab === 'editor' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/70'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowWorkspace(false)}
          className="ml-2 h-8 w-8 p-0"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className={`flex-1 overflow-hidden ${showTerminal ? `h-[calc(100%-${terminalHeight+10}px)]` : ''}`}>
        {activeTab === 'workflow' && (
          <div className="h-full overflow-auto p-4">
            <WorkflowDisplay 
              workflowSteps={workflowSteps} 
              workflowEndRef={workflowEndRef} 
            />
          </div>
        )}
        
        {activeTab === 'files' && (
          <FileExplorer 
            fileSystem={fileSystem} 
            selectedFile={selectedFile} 
            toggleDirectory={toggleDirectory} 
            selectFile={selectFile}
          />
        )}
        
        {activeTab === 'editor' && (
          <div className="h-full flex flex-col overflow-hidden">
            <FileViewer selectedFile={selectedFile} />
          </div>
        )}
      </div>

      {/* Terminal toggle button */}
      <button
        onClick={() => {
          setShowTerminal(!showTerminal);
          setTimeout(() => {
            if (!showTerminal) {
              terminalInputRef.current?.focus();
            }
          }, 50);
        }}
        className={`absolute bottom-3 right-3 z-20 h-10 w-10 rounded-full flex items-center justify-center ${
          showTerminal ? 'bg-gray-700 text-white' : 'bg-primary text-primary-foreground'
        } shadow-md hover:opacity-90 transition-colors`}
        title="Toggle Terminal"
      >
        <TerminalIcon className="h-5 w-5" />
      </button>
      
      {/* Terminal Panel */}
      {showTerminal && (
        <div 
          className="absolute bottom-0 left-0 right-0 border-t border-gray-700 bg-[#1D1E1F] flex flex-col overflow-hidden z-10 terminal-panel"
          style={{ height: `${terminalHeight}px` }}
        >
          {/* Terminal Resize handle */}
          <ResizeHandle 
            direction="vertical" 
            onMouseDown={handleTerminalMouseDown} 
          />
          
          {editingFile ? (
            <FileEditor 
              filePath={filePath}
              fileContent={fileContent}
              setFileContent={setFileContent}
              saveFileContent={saveFileContent}
              cancelFileEditing={cancelFileEditing}
              editorHeight={editorHeight}
              handleEditorMouseDown={handleEditorMouseDown}
              fileEditorRef={fileEditorRef}
            />
          ) : (
            <Terminal 
              terminal={terminal}
              showWelcomeMessage={showWelcomeMessage}
              terminalInput={terminalInput}
              setTerminalInput={setTerminalInput}
              terminalProcessing={terminalProcessing}
              workingDirectory={workingDirectory}
              completions={completions}
              showCompletions={showCompletions}
              selectedCompletion={selectedCompletion}
              selectCompletion={selectCompletion}
              setShowCompletions={setShowCompletions}
              setSelectedCompletion={setSelectedCompletion}
              executeTerminalCommand={executeTerminalCommand}
              copiedText={copiedText}
              copyTerminalContent={copyTerminalContent}
              clearTerminal={clearTerminal}
              refreshFileSystem={refreshFileSystem}
              closeTerminal={closeTerminal}
              terminalInputRef={terminalInputRef}
              terminalEndRef={terminalEndRef}
            />
          )}
        </div>
      )}
    </div>
  );
} 