import { SendIcon, Bot, User, Circle, WifiOff, RefreshCw, AlertTriangle, Server, Terminal, Mic } from "lucide-react";
import { ChatAreaProps } from "@/types/chat";
import { renderMessageContent, diagnoseWebSocketIssues } from "@/lib/chat-utils";
import { useWebSocket } from "@/app/contexts/WebSocketContext";
import { useEffect, useState } from "react";

export function ChatArea({
  messages,
  input,
  setInput,
  handleSubmit,
  isLoading,
  needsClarification,
  inputPrompt,
  inputRequired,
  messagesEndRef
}: ChatAreaProps) {
  const { connected, refreshConnection, socket, backendMissing, connectionAttempted } = useWebSocket();
  const [showReconnectMsg, setShowReconnectMsg] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [transportType, setTransportType] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Show reconnect message after connection loss
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (!connected && connectionAttempted && !backendMissing) {
      timer = setTimeout(() => {
        setShowReconnectMsg(true);
        setConnectionAttempts(prev => prev + 1);
      }, 5000);
    } else {
      setShowReconnectMsg(false);
      setReconnecting(false);
      setConnectionAttempts(0);
      setShowDiagnostics(false);
      setRetryCount(0);
      
      // Check transport type when connected
      if (socket?.io?.engine?.transport?.name) {
        // @ts-ignore - internal Socket.IO property
        setTransportType(socket.io.engine.transport.name);
      }
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [connected, socket, connectionAttempted, backendMissing]);

  // Progressive reconnection strategy
  const handleReconnect = () => {
    // If backend is missing, show message instead
    if (backendMissing) {
      window.alert('The backend server is not running. Please start the server and then refresh this page.');
      return;
    }
    
    setReconnecting(true);
    setRetryCount(prev => prev + 1);
    
    // Simple refresh if multiple retries have failed
    if (retryCount > 1) {
      window.location.reload();
      return;
    }
    
    // Call the underlying reconnection function
    refreshConnection();
    
    // Set a timeout to reset the reconnecting state if it takes too long
    setTimeout(() => {
      if (!connected) {
        setReconnecting(false);
      }
    }, 5000);
  };

  // Get appropriate connection error message
  const getConnectionErrorMessage = () => {
    if (backendMissing) {
      return "Backend server is not running";
    }
    if (connectionAttempts > 2) {
      return "Connection issues persist. Try refreshing the page.";
    }
    return "Connection to server lost";
  };

  // Get button text
  const getButtonText = () => {
    if (backendMissing) return 'Start Server';
    if (reconnecting) return 'Reconnecting...';
    if (retryCount > 0) return 'Refresh Page';
    return 'Reconnect';
  };

  // Show development instructions for starting the server
  const getBackendInstructions = () => {
    return (
      <div className="p-3 text-xs">
        <p className="font-medium mb-1">To start the backend server:</p>
        <div className="bg-gray-800 p-2 rounded mb-2 font-mono">
          <p>cd backend</p>
          <p>python app.py</p>
        </div>
        <p>Then refresh this page.</p>
      </div>
    );
  };

  // Check if messages array is empty
  const hasMessages = messages && messages.length > 0;

  return (
    <div className="flex flex-col h-full w-full bg-[#131314]">
      {/* Backend missing alert */}
      {backendMissing && (
        <div className="bg-red-900/80 border-b border-red-700 text-white px-4 py-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-red-300" />
              <span className="font-medium">Backend server is not running</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded"
            >
              <RefreshCw size={14} />
              Refresh Page
            </button>
          </div>
          {showDiagnostics && getBackendInstructions()}
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)} 
            className="text-xs text-red-300 underline self-start mt-1"
          >
            {showDiagnostics ? 'Hide instructions' : 'Show instructions'}
          </button>
        </div>
      )}

      {/* Connection lost alert (only show if backend is running but connection lost) */}
      {!connected && !backendMissing && connectionAttempted && (
        <div className="bg-yellow-900/50 border-b border-yellow-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff size={18} className="text-yellow-400" />
            <span>{getConnectionErrorMessage()}</span>
          </div>
          {showReconnectMsg && (
            <button 
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center gap-1 text-xs bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded disabled:opacity-50"
            >
              <RefreshCw size={14} className={reconnecting ? "animate-spin" : ""} />
              {getButtonText()}
            </button>
          )}
        </div>
      )}

      {/* Transport type information - only show when debugging */}
      {transportType && process.env.NODE_ENV !== 'production' && (
        <div className="bg-gray-800/50 border-b border-gray-700 text-gray-300 text-xs px-4 py-1">
          Using transport: {transportType}
        </div>
      )}

      {/* Main content container with proper layout */}
      <div className="flex flex-col flex-grow relative">
        {/* Messages area with ChatGPT style */}
        <div className="flex-1 overflow-y-auto w-full">
          {!hasMessages && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-2xl font-semibold mb-4 text-white">What can I help with?</h1>
              
              {backendMissing ? (
                <div className="text-center max-w-md">
                  <Server size={40} className="mx-auto mb-3 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2 text-gray-200">Backend Server Not Running</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    The chat functionality requires a backend server to be running. Please start the server and refresh this page.
                  </p>
                  <div className="bg-gray-800/80 p-3 rounded-md text-xs font-mono text-gray-300 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal size={12} />
                      <span className="font-medium">Start the backend server:</span>
                    </div>
                    <div className="bg-gray-900 p-2 rounded mb-1">
                      <p>cd backend</p>
                      <p>python app.py</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-md">
                  <div className="bg-[#202123] p-3 rounded-lg hover:bg-[#2a2b32] cursor-pointer transition">
                    <p className="font-medium text-sm text-gray-200 mb-1">Create a simple todo app</p>
                    <p className="text-xs text-gray-400">with React and TypeScript</p>
                  </div>
                  <div className="bg-[#202123] p-3 rounded-lg hover:bg-[#2a2b32] cursor-pointer transition">
                    <p className="font-medium text-sm text-gray-200 mb-1">Explain quantum computing</p>
                    <p className="text-xs text-gray-400">in simple terms</p>
                  </div>
                  <div className="bg-[#202123] p-3 rounded-lg hover:bg-[#2a2b32] cursor-pointer transition">
                    <p className="font-medium text-sm text-gray-200 mb-1">Write a Python script</p>
                    <p className="text-xs text-gray-400">to analyze CSV data</p>
                  </div>
                  <div className="bg-[#202123] p-3 rounded-lg hover:bg-[#2a2b32] cursor-pointer transition">
                    <p className="font-medium text-sm text-gray-200 mb-1">How do I make an API</p>
                    <p className="text-xs text-gray-400">with FastAPI and PostgreSQL</p>
                  </div>
                </div>
              )}
            </div>
          )}
        
          {hasMessages && (
            <div className="pt-3 md:pt-6 w-full pb-16">
              {messages.map((message, index) => (
                <div key={index} className={`px-3 md:px-6 lg:px-10 py-3 ${message.role === 'assistant' ? 'bg-[#1C1C1E]' : message.role === 'system' ? 'bg-yellow-950/20' : ''}`}>
                  <div className="max-w-3xl mx-auto flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 pt-0.5">
                      {message.role === 'user' ? (
                        <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-white">
                          <User size={14} />
                        </div>
                      ) : message.role === 'assistant' ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                          <Bot size={14} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-yellow-600 flex items-center justify-center text-white">
                          <AlertTriangle size={14} />
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 prose prose-invert prose-sm max-w-none text-sm leading-relaxed ${
                      message.role === 'user' ? 'text-white' : 'text-gray-100'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator — shown while waiting for a response */}
              {isLoading && (
                <div className="px-3 md:px-6 lg:px-10 py-2 bg-[#1E1E1E]">
                  <div className="max-w-3xl mx-auto flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white">
                        <Bot size={14} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 h-6">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-16" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 w-full bg-[#131314] border-t border-[#2A2A2A] p-3 md:p-4 mt-auto">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={backendMissing ? "Start the backend server first..." : connected ? (inputPrompt || "Ask anything...") : "Reconnect to send messages..."}
                className="w-full bg-[#2A2B32] border border-[#555] text-white text-sm rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:border-gray-400 placeholder:text-gray-400 disabled:opacity-60"
                disabled={isLoading || (inputRequired && !input) || !connected || backendMissing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || !connected || backendMissing}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md ${input.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {isLoading ? (
                  <RefreshCw size={16} className="text-white animate-spin" />
                ) : (
                  <SendIcon size={16} className="text-white" />
                )}
              </button>
            </form>
            <p className="text-xs text-center text-gray-500 mt-1">
              Messages are processed on your organization's server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 