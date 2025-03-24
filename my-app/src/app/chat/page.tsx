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

export default function ChatPage() {
  const router = useRouter();
  const webSocket = useWebSocket();
  const terminal = useTerminal();
  const fileSystem = useFileSystem();
  const resizing = useResizing();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [activeTab, setActiveTab] = useState('workflow');
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

  // Check if workflow contains clarification requests
  useEffect(() => {
    const needsInput = webSocket.inputRequired || false;

    if (needsInput && !needsClarification) {
      setNeedsClarification(true);
    } else if (!needsInput && needsClarification) {
      setNeedsClarification(false);
    }
  }, [webSocket.inputRequired, needsClarification]);

  // Automatically focus terminal input when terminal tab is selected
  useEffect(() => {
    if (terminal.showTerminal) {
      const timer = setTimeout(() => {
        terminal.terminalInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [terminal.showTerminal]);

  // Add cleanup effect for event listeners
  useEffect(() => {
    return () => {
      const cleanupEvents = (event: string) => {
        document.removeEventListener(event, () => {});
      };
      
      cleanupEvents('mousemove');
      cleanupEvents('mouseup');
    };
  }, []);

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
    <div className="flex flex-col h-screen">
      <div className="flex-none z-10">
        <Navbar />
      </div>
      
      <div className="flex-1 overflow-hidden pt-16">
        {/* Main Workspace Layout */}
        <div className="flex flex-row w-full h-[calc(100vh-64px)] chat-workspace-container">
          {/* Chat Section */}
          <div 
            className="flex flex-col border-r transition-all duration-75"
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
          
          {/* Vertical Resize Handle */}
          {showWorkspace && (
            <ResizeHandle
              direction="horizontal"
              onMouseDown={resizing.handleHorizontalMouseDown}
            />
          )}
          
          {/* Workspace Section */}
          {showWorkspace && (
            <Workspace 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showWorkspace={showWorkspace}
              setShowWorkspace={setShowWorkspace}
              width={resizing.workspaceWidth}
              handleHorizontalMouseDown={resizing.handleHorizontalMouseDown}
              fileSystem={fileSystem.fileSystem}
              selectedFile={fileSystem.selectedFile}
              workflowSteps={webSocket.workflowSteps}
              setSelectedFile={fileSystem.setSelectedFile}
              toggleDirectory={fileSystem.toggleDirectory}
              terminal={webSocket.terminal}
              showWelcomeMessage={terminal.showWelcomeMessage}
              workingDirectory={webSocket.workingDirectory}
              showTerminal={terminal.showTerminal}
              setShowTerminal={terminal.setShowTerminal}
              terminalHeight={resizing.terminalHeight}
              handleTerminalMouseDown={resizing.handleTerminalMouseDown}
              editingFile={terminal.editingFile}
              fileContent={terminal.fileContent}
              filePath={terminal.filePath}
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
              fileEditorRef={terminal.fileEditorRef}
              workflowEndRef={workflowEndRef}
            />
          )}
        </div>
      </div>
    </div>
  );
} 