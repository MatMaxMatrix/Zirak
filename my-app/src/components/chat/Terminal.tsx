import { Input } from "@/components/ui/input";
import { 
  Terminal as TerminalIcon, 
  Copy, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  XCircle 
} from "lucide-react";
import { TerminalProps } from "@/types/chat";
import { v4 as uuidv4 } from 'uuid';

export function Terminal({
  terminal,
  showWelcomeMessage,
  terminalInput,
  setTerminalInput,
  terminalProcessing,
  workingDirectory,
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
  closeTerminal,
  terminalInputRef,
  terminalEndRef
}: TerminalProps) {
  
  // Focus terminal input when clicking on terminal
  const focusTerminalInput = () => {
    terminalInputRef.current?.focus();
  };
  
  // Handle terminal submission
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (terminalInput.trim() && !terminalProcessing) {
      executeTerminalCommand(terminalInput);
    }
  };
  
  return (
    <>
      <div className="p-1 bg-[#1D1E1F] text-white flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center">
          <TerminalIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-xs font-medium">Terminal</span>
          <span className="text-xs ml-2 text-gray-500">
            {workingDirectory 
              ? `~/projects${workingDirectory !== '/project' ? `/${workingDirectory.split('/').pop()}` : ''}`
              : '~/projects'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={copyTerminalContent}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="Copy terminal content"
          >
            {copiedText ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={() => {
              clearTerminal();
              setTimeout(() => {
                terminalInputRef.current?.focus();
              }, 10);
            }}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="Clear terminal"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={() => {
              refreshFileSystem();
              setTimeout(() => {
                terminalInputRef.current?.focus();
              }, 10);
            }}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="Refresh file system"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={closeTerminal}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="Close terminal"
          >
            <XCircle size={14} />
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-auto p-0 font-mono bg-black text-gray-200 rounded-none terminal-scrollbar mac-terminal"
        style={{ tabSize: 4 }}
        onClick={focusTerminalInput}
      >
        <div className="p-2 min-h-full">
          {terminal.length === 0 && !showWelcomeMessage ? (
            <div className="flex items-center text-sm whitespace-nowrap">
              <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
              <span className="text-white mx-1">:</span>
              <span className="text-[#61AFEF]">~/projects</span>
              <span className="text-white mx-1">$ </span>
              <span className="terminal-cursor"></span>
            </div>
          ) : terminal.length === 0 && showWelcomeMessage ? (
            <div className="text-left h-full">
              <div className="mb-1">
                <span className="text-gray-300">Last login: {new Date().toLocaleString()} on ttys001</span>
              </div>
              <div className="mb-1">
                <span className="text-green-400">Welcome to Zirak Terminal</span>
              </div>
              <div className="mb-1 text-xs text-gray-400">
                <p>This is an isolated environment for your project.</p>
              </div>
              <div className="flex items-center text-sm whitespace-nowrap">
                <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                <span className="text-white mx-1">:</span>
                <span className="text-[#61AFEF]">~/projects</span>
                <span className="text-white mx-1">$ </span>
                <span className="terminal-cursor"></span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-200 whitespace-pre-line">
              {showWelcomeMessage && terminal.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-300">Last login: {new Date().toLocaleString()} on ttys001</span>
                </div>
              )}
              {terminal.map((cmd) => (
                <div key={cmd.id}>
                  <div className="flex items-center text-sm whitespace-nowrap">
                    <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                    <span className="text-white mx-1">:</span>
                    <span className="text-[#61AFEF]">
                      ~/projects{workingDirectory && workingDirectory !== '/project' ? 
                        `/${workingDirectory.split('/').pop()}` : ''}
                    </span>
                    <span className="text-white mx-1">$ </span>
                    <span className="text-gray-100">{cmd.command}</span>
                  </div>
                  {cmd.output && (
                    <pre className={`${cmd.error ? 'text-[#E06C75]' : 'text-gray-200'} mt-0 mb-1 whitespace-pre-wrap text-xs`}>
                      {cmd.output}
                    </pre>
                  )}
                  {cmd.exitCode !== undefined && cmd.exitCode !== 0 && (
                    <div className="text-xs text-[#E06C75]">
                      Exit code: {cmd.exitCode}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center text-sm whitespace-nowrap mt-1">
                <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
                <span className="text-white mx-1">:</span>
                <span className="text-[#61AFEF]">
                  ~/projects{workingDirectory && workingDirectory !== '/project' ? 
                    `/${workingDirectory.split('/').pop()}` : ''}
                </span>
                <span className="text-white mx-1">$ </span>
                {terminalProcessing ? (
                  <span className="text-gray-500">Processing...</span>
                ) : (
                  terminalInput ? <span className="text-gray-100">{terminalInput}</span> : null
                )}
                {!terminalProcessing && !terminalInput && (
                  <span className="terminal-cursor"></span>
                )}
              </div>
              
              {/* Auto-completion dropdown */}
              {showCompletions && completions.length > 0 && (
                <div className="absolute bg-gray-800 border border-gray-700 rounded shadow-lg mt-1 max-h-48 overflow-y-auto z-10" style={{ left: '20px', top: 'auto' }}>
                  <div className="text-xs text-gray-400 p-1 border-b border-gray-700">
                    Tab completions ({completions.length})
                  </div>
                  {completions.map((item, index) => (
                    <div 
                      key={index}
                      className={`px-3 py-1 cursor-pointer font-mono text-sm ${
                        index === selectedCompletion ? 'bg-blue-900 text-white' : 'hover:bg-gray-700'
                      }`}
                      onClick={() => selectCompletion(item)}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
      
      <div className="border-t border-gray-800 bg-black">
        <form onSubmit={handleTerminalSubmit} className="flex">
          <Input
            ref={terminalInputRef}
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            placeholder=""
            className="flex-1 bg-black border-0 text-transparent caret-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-8 p-0"
            disabled={terminalProcessing}
            autoComplete="off"
            spellCheck="false"
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                // Tab completion handled at parent level
              } else if (e.key === 'ArrowUp' && showCompletions) {
                e.preventDefault();
                setSelectedCompletion(selectedCompletion > 0 ? selectedCompletion - 1 : completions.length - 1);
              } else if (e.key === 'ArrowDown' && showCompletions) {
                e.preventDefault();
                setSelectedCompletion(selectedCompletion < completions.length - 1 ? selectedCompletion + 1 : 0);
              } else if (e.key === 'Escape' && showCompletions) {
                e.preventDefault();
                setShowCompletions(false);
              } else if (e.key === 'Enter' && showCompletions) {
                e.preventDefault();
                selectCompletion(completions[selectedCompletion]);
              }
            }}
          />
        </form>
      </div>
    </>
  );
} 