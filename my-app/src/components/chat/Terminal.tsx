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
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function Terminal({
  terminal,
  showWelcomeMessage,
  input,
  setInput,
  isProcessing,
  workingDirectory = '',
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

  // Use a hidden textarea for actual input
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Keep track of cursor blinking
  const [cursorVisible, setCursorVisible] = useState(true);
  
  // Focus hidden input when clicking on terminal
  const focusTerminal = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };
  
  // When terminal updates, scroll to bottom and focus
  useEffect(() => {
    if (terminalEndRef?.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(focusTerminal, 0);
  }, [terminal]);

  // Set up blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    
    return () => clearInterval(blinkInterval);
  }, []);

  // Initial focus and setup
  useEffect(() => {
    focusTerminal();
    
    // Listen for click events anywhere in the terminal
    const handleClick = () => focusTerminal();
    document.querySelector('.mac-terminal')?.addEventListener('click', handleClick);
    
    return () => {
      document.querySelector('.mac-terminal')?.removeEventListener('click', handleClick);
    };
  }, []);
  
  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTerminalSubmit();
      return;
    }
    
    // Handle tab completion
    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (showCompletions) {
        // If completions are already shown, select the current one
        onSelectCompletion(selectedCompletion);
      } else {
        // Otherwise try to get completions
        console.log('Tab pressed, should show completions');
      }
      return;
    }
    
    // Navigate completions with arrow keys
    if (showCompletions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCompletion((selectedCompletion + 1) % completions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCompletion((selectedCompletion - 1 + completions.length) % completions.length);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCompletions(false);
      }
    }
  };
  
  // Handle form submission
  const handleTerminalSubmit = () => {
    if (!input.trim() || isProcessing) return;
    
    // Store the command we're about to send
    const commandToSend = input;
    
    // Clear input state
    setInput('');
    setShowCompletions(false);
    
    // Clear the input field
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = '';
    }
    
    // Send the command
    onSendCommand(commandToSend);
    
    // Keep focus in terminal after submission
    setTimeout(focusTerminal, 10);
  };
  
  // Handle completion selection
  const handleCompletionClick = (index: number) => {
    onSelectCompletion(index);
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden relative" onClick={focusTerminal}>
      {/* Hidden textarea for capturing input */}
      <textarea
        ref={hiddenInputRef}
        className="opacity-0 absolute h-0 w-0 overflow-hidden"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    
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
              <span className="text-gray-100">{input}</span>
              {cursorVisible && <span className="bg-white w-[0.5em] h-[1.2em] inline-block ml-[1px]"></span>}
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
              
              {/* Current command line */}
              <div className="flex items-start text-sm whitespace-nowrap mt-1">
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
                  <>
                    <span className="text-gray-100">{input}</span>
                    {cursorVisible && <span className="bg-white w-[0.5em] h-[1.2em] inline-block ml-[1px]"></span>}
                  </>
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
                      onClick={() => handleCompletionClick(index)}
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
      
      {/* Show notification when text is copied */}
      {copiedText && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white px-3 py-1.5 rounded text-sm animate-fadeOut">
          {copiedText}
        </div>
      )}
    </div>
  );
} 