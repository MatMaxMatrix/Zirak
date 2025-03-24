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
  input,
  setInput,
  isProcessing,
  workingDirectory,
  completions,
  showCompletions,
  selectedCompletion,
  onSelectCompletion,
  setShowCompletions,
  setSelectedCompletion,
  onSendCommand,
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
    terminalInputRef?.current?.focus();
  };
  
  // Handle terminal submission
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const command = input.trim();
    setInput("");
    onSendCommand(command);
  };

  // Handle tab key press for tab completion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // If we have completions and one is selected, use it
      if (showCompletions && selectedCompletion >= 0 && selectedCompletion < completions.length) {
        onSelectCompletion(completions[selectedCompletion]);
        return;
      }
      
      // Otherwise, show completions for the current input
      if (input.trim()) {
        setShowCompletions(true);
      }
    } else if (e.key === 'ArrowUp') {
      if (showCompletions) {
        e.preventDefault();
        setSelectedCompletion(Math.max(0, selectedCompletion - 1));
      }
    } else if (e.key === 'ArrowDown') {
      if (showCompletions) {
        e.preventDefault();
        setSelectedCompletion(Math.min(completions.length - 1, selectedCompletion + 1));
      }
    } else if (e.key === 'Escape') {
      if (showCompletions) {
        e.preventDefault();
        setShowCompletions(false);
      }
    } else if (e.key === 'Enter') {
      if (showCompletions && selectedCompletion >= 0 && selectedCompletion < completions.length) {
        e.preventDefault();
        onSelectCompletion(completions[selectedCompletion]);
      }
    }
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden" onClick={focusTerminalInput}>
      {/* Terminal Content */}
      <div 
        className="flex-1 overflow-auto p-0 font-mono bg-black text-gray-200 rounded-none terminal-scrollbar mac-terminal"
        style={{ tabSize: 4 }}
      >
        <div className="p-2 min-h-full">
          {terminal.length === 0 ? (
            <div className="flex items-center text-sm whitespace-nowrap">
              <span className="text-[#56B6C2] font-medium">virtual-user@zirak</span>
              <span className="text-white mx-1">:</span>
              <span className="text-[#61AFEF]">~/projects</span>
              <span className="text-white mx-1">$ </span>
              <span className="terminal-cursor"></span>
            </div>
          ) : (
            <div className="text-sm text-gray-200 whitespace-pre-line">
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
                {isProcessing ? (
                  <span className="text-gray-500">Processing...</span>
                ) : (
                  input ? <span className="text-gray-100">{input}</span> : null
                )}
                {!isProcessing && !input && (
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
                      onClick={() => onSelectCompletion(item)}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder=""
            className="flex-1 bg-black border-0 text-transparent caret-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-8 p-0"
            disabled={isProcessing}
            autoComplete="off"
            spellCheck="false"
            onKeyDown={handleKeyDown}
          />
        </form>
      </div>
    </div>
  );
} 