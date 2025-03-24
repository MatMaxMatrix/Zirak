"use client";

import { Navbar } from "@/components/landing/navbar";
import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useRouter } from 'next/navigation';
import { ChatArea } from "@/components/chat/ChatArea";
import { Workspace } from "@/components/chat/Workspace";
import { ResizeHandle } from "@/components/chat/ResizeHandle";
import { useTerminal } from "@/hooks/useTerminal";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useResizing } from "@/hooks/useResizing";
import { v4 as uuidv4 } from 'uuid';
import { ChevronRight, Terminal as TerminalIcon } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const webSocket = useWebSocket();
  const terminal = useTerminal();
  const fileSystem = useFileSystem();
  const resizing = useResizing();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflow' | 'editor' | 'preview'>('workflow');
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  
  // References for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workflowEndRef = useRef<HTMLDivElement>(null);

  // Send initial prompt from localStorage on component mount
  useEffect(() => {
    const initialPrompt = localStorage.getItem('initial_prompt');
    if (initialPrompt) {
      webSocket.sendMessage(initialPrompt);
      localStorage.removeItem('initial_prompt');
    }
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webSocket.messages]);

  // Scroll workflow to bottom whenever steps change
  useEffect(() => {
    if (showWorkflow && webSocket.workflowSteps.length > 0) {
      workflowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [webSocket.workflowSteps, showWorkflow]);

  // Scroll terminal to bottom whenever commands change
  useEffect(() => {
    terminal.terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [webSocket.terminal]);

  // Add cleanup effect for event listeners
  useEffect(() => {
    let isResizing = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        // Get the container width
        const container = document.querySelector('.chat-workspace-container');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = Math.min(Math.max(10, (e.clientX / containerRect.width) * 100), 90);
        
        resizing.setWorkspaceWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing = false;
    };

    const handleMouseDown = () => {
      isResizing = true;
    };

    // Update the document event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing.setWorkspaceWidth]);

  // Automatically focus terminal input when terminal tab is selected
  useEffect(() => {
    if (terminal.showTerminal) {
      const timer = setTimeout(() => {
        terminal.terminalInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [terminal.showTerminal, terminal.terminalInputRef]);

  // Check if workflow contains clarification requests
  useEffect(() => {
    setNeedsClarification(webSocket.inputRequired || false);
  }, [webSocket.inputRequired]);

  // Use the terminal and editor refs from resizing hook
  useEffect(() => {
    // Connect the refs between the terminal and editor components
    if (resizing.terminalRef && terminal.terminalInputRef) {
      // Optional connection logic if needed
    }
  }, [resizing.terminalRef, terminal.terminalInputRef]);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    setIsLoading(true);
    
    // If we need input for a workflow, provide it instead of starting a new one
    if (webSocket.inputRequired) {
      webSocket.sendUserInputResponse(input);
    } else {
      // Otherwise, send a new message
      webSocket.sendMessage(input);
    }
    
    setInput('');
  };

  // Inside the component, add the terminal toggle function
  const toggleTerminal = () => {
    terminal.setShowTerminal(!terminal.showTerminal);
  };

  // Return the debug component to show connection status
  if (debugVisible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">WebSocket Connection Debug</h1>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span>Connection Status:</span>
              <span className={`px-2 py-1 rounded text-white ${webSocket.connected ? 'bg-green-500' : 'bg-red-500'}`}>
                {webSocket.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => setDebugVisible(false)} 
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Continue to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0C0C0C] text-white">
      <div className="flex-none z-10">
        <Navbar />
      </div>
      
      <div className="flex-1 overflow-hidden pt-12">
        {/* Main Workspace Layout */}
        <div className="flex flex-row w-full h-[calc(100vh-48px)] chat-workspace-container">
          {/* Workspace Section */}
          <div 
            className="flex flex-col border-r border-[#2A2A2A] transition-all duration-75 bg-[#161616] relative"
            style={{ width: showWorkspace ? `${resizing.workspaceWidth}%` : '0%' }}
          >
            {showWorkspace && (
              <>
                <Workspace 
                  activeTab={activeTab as 'workflow' | 'editor' | 'preview'}
                  setActiveTab={setActiveTab}
                  showWorkspace={showWorkspace}
                  setShowWorkspace={setShowWorkspace}
                  width={100}
                  handleHorizontalMouseDown={resizing.handleHorizontalMouseDown}
                  fileSystem={fileSystem.fileSystem}
                  selectedFile={fileSystem.selectedFile}
                  workflowSteps={webSocket.workflowSteps || []}
                  setSelectedFile={fileSystem.setSelectedFile}
                  toggleDirectory={fileSystem.toggleDirectory}
                  terminal={webSocket.terminal}
                  showWelcomeMessage={terminal.showWelcomeMessage}
                  workingDirectory={webSocket.workingDirectory || ""}
                  showTerminal={terminal.showTerminal}
                  setShowTerminal={terminal.setShowTerminal}
                  terminalHeight={resizing.terminalHeight}
                  handleTerminalMouseDown={resizing.handleTerminalMouseDown}
                  editingFile={terminal.editingFile}
                  fileContent={terminal.fileContent}
                  filePath={terminal.filePath || ""}
                  setFileContent={terminal.setFileContent}
                  saveFileContent={terminal.saveFileContent}
                  cancelFileEditing={terminal.cancelFileEditing}
                  editorHeight={resizing.editorHeight}
                  handleEditorMouseDown={resizing.handleEditorMouseDown}
                  terminalInput={terminal.terminalInput}
                  setTerminalInput={terminal.setTerminalInput}
                  terminalProcessing={terminal.terminalProcessing}
                  completions={terminal.completions}
                  showCompletions={terminal.showCompletions}
                  selectedCompletion={terminal.selectedCompletion}
                  selectCompletion={terminal.selectCompletion}
                  setShowCompletions={terminal.setShowCompletions}
                  setSelectedCompletion={terminal.setSelectedCompletion}
                  executeTerminalCommand={terminal.executeTerminalCommand}
                  copiedText={terminal.copiedText}
                  copyTerminalContent={terminal.copyTerminalContent}
                  clearTerminal={terminal.clearTerminal}
                  refreshFileSystem={terminal.refreshFileSystem}
                  terminalInputRef={terminal.terminalInputRef}
                  terminalEndRef={terminal.terminalEndRef}
                  fileEditorRef={resizing.editorRef}
                  terminalRef={resizing.terminalRef}
                  workflowEndRef={workflowEndRef}
                  fileExplorerWidth={resizing.fileExplorerWidth}
                  handleFileExplorerResize={resizing.handleFileExplorerResize}
                />
                
                {/* Terminal Button - Only show when terminal is closed */}
                {!terminal.showTerminal && (
                  <div className="absolute bottom-0 left-0 w-full px-3 py-2 bg-gradient-to-t from-[#161616] to-transparent z-10">
                    <button
                      onClick={toggleTerminal}
                      className="flex items-center gap-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-md py-1 px-2 text-gray-300 hover:text-white shadow-lg transition-colors mx-auto text-xs"
                      title="Open Terminal"
                    >
                      <TerminalIcon size={12} />
                      <span>Open Terminal</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Show re-open button when workspace is minimized */}
          {!showWorkspace && (
            <button
              onClick={() => setShowWorkspace(true)}
              className="h-full flex items-center justify-center bg-[#1A1A1A] border-r border-[#2A2A2A] px-1 hover:bg-[#2A2A2A] transition-colors"
              title="Show Workspace"
            >
              <ChevronRight className="h-3 w-3 text-gray-400" />
            </button>
          )}
          
          {/* Vertical Resize Handle */}
          {showWorkspace && (
            <ResizeHandle
              direction="horizontal"
              onMouseDown={resizing.handleHorizontalMouseDown}
            />
          )}

          {/* Chat Section */}
          <div 
            className="flex-1 bg-[#131314] flex flex-col overflow-hidden"
            style={{ width: showWorkspace ? `${100 - resizing.workspaceWidth}%` : '100%' }}
          >
            <ChatArea 
              messages={webSocket.messages}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              needsClarification={needsClarification}
              inputPrompt={webSocket.inputPrompt || ""}
              inputRequired={webSocket.inputRequired || false}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 