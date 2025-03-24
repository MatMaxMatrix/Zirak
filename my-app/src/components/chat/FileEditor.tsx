import { useState, useCallback, useEffect, useRef } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { Button } from '@/components/ui/button';
import { FileEditorProps } from '@/types/chat';
import { getLanguageFromFilePath } from '@/utils/languages';
import { X, Circle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useWebSocket } from '@/app/contexts/WebSocketContext';

interface OpenedFile {
  path: string;
  hasUnsavedChanges: boolean;
}

export function FileEditor({
  filePath,
  fileContent,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  handleEditorMouseDown,
  fileEditorRef,
  editorHeight
}: FileEditorProps) {
  const webSocket = useWebSocket();
  const language = getLanguageFromFilePath(filePath);
  const [isDragging, setIsDragging] = useState(false);
  const [localEditorHeight, setLocalEditorHeight] = useState(editorHeight || 400); // Use prop or default 400px
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const layoutUpdateTimerRef = useRef<number | null>(null);
  
  // Update local state when fileContent prop changes
  useEffect(() => {
    if (fileContent !== undefined) {
      setHasUnsavedChanges(false);
    }
  }, [fileContent]);
  
  // Update local editor height when prop changes
  useEffect(() => {
    if (editorHeight && editorHeight !== localEditorHeight) {
      setLocalEditorHeight(editorHeight);
    }
  }, [editorHeight]);

  const handleContentChange = (newContent: string) => {
    if (newContent !== fileContent) {
      setFileContent(newContent);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      console.log('Saving file...');
      
      // Set savingFromEditor flag in the WebSocketContext
      webSocket.savingFromEditor = true;
      
      // Check if saveFileContent is a function before calling it
      if (typeof saveFileContent === 'function') {
        await saveFileContent();
      } else {
        console.error('saveFileContent is not a function');
        throw new Error('Save function is not available');
      }
      
      // Reset the flag after save
      webSocket.savingFromEditor = false;
      
      console.log('File saved successfully');
      setHasUnsavedChanges(false);
      toast.success('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset the flag if save fails
      webSocket.savingFromEditor = false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Do you want to close without saving?');
      if (!shouldClose) {
        return;
      }
    }
    cancelFileEditing();
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startY = e.clientY;
    const startHeight = localEditorHeight;
    let rafId: number | null = null;
    let lastY = startY;
    let currentHeight = startHeight;

    const handleMouseMove = (e: MouseEvent) => {
      // Cancel any pending animation frame to avoid multiple updates
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Schedule the resize in an animation frame for smoother performance
      rafId = requestAnimationFrame(() => {
        const deltaY = e.clientY - lastY;
        lastY = e.clientY;
        
        currentHeight = Math.max(150, currentHeight + deltaY); // Minimum height of 150px
        
        // Apply height change to the element directly for immediate feedback
        if (fileEditorRef.current) {
          fileEditorRef.current.style.height = `${currentHeight}px`;
        }
        
        // Throttle the state updates to reduce re-renders
        if (layoutUpdateTimerRef.current) {
          clearTimeout(layoutUpdateTimerRef.current);
        }
        
        layoutUpdateTimerRef.current = window.setTimeout(() => {
          setLocalEditorHeight(currentHeight);
          layoutUpdateTimerRef.current = null;
        }, 50) as unknown as number;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Clear any throttled updates
      if (layoutUpdateTimerRef.current) {
        clearTimeout(layoutUpdateTimerRef.current);
        layoutUpdateTimerRef.current = null;
      }
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Ensure final height is committed to state
      setLocalEditorHeight(currentHeight);
      
      // Remove class from body
      document.body.classList.remove('resize-active');
    };

    // Use passive: false to ensure preventDefault works properly
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add class to body to prevent text selection during resize
    document.body.classList.add('resize-active');
  }, [localEditorHeight, fileEditorRef]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Add global Ctrl+S or Command+S handler
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  // Add global key handler
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div 
      className={`flex flex-col ${isDragging ? 'select-none' : ''}`} 
      ref={fileEditorRef}
      style={{ height: `${localEditorHeight}px`, minHeight: '150px' }}
    >
      {/* Tab Bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#1D1D1D] h-9 px-2">
        <div className="flex items-center h-full">
          <div 
            className={`
              flex items-center h-full px-3 gap-2 
              bg-[#1E1E1E] border-t border-l border-r border-[#1D1D1D]
              text-sm text-gray-300
            `}
          >
            <span className="max-w-[150px] truncate">{filePath.split('/').pop()}</span>
            {hasUnsavedChanges && (
              <Circle className="h-2 w-2 fill-current text-gray-400" />
            )}
            <button
              onClick={handleClose}
              className="hover:bg-[#333333] rounded p-0.5 -mr-1"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-xs
              ${isSaving ? 'bg-gray-600 cursor-not-allowed' : hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}
              text-white transition-colors
            `}
            title="Save file (⌘S on Mac, Ctrl+S on Windows/Linux)"
          >
            <Save className="h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* File Path Bar */}
      <div className="flex items-center justify-between p-2 border-b border-[#1D1D1D] bg-[#1E1E1E] shrink-0">
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <span className="text-gray-500 text-xs">{filePath}</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          value={fileContent || ''}
          language={language}
          onChange={handleContentChange}
          onSave={handleSave}
          height={`${localEditorHeight - 40}px`} // Subtract header height
        />
      </div>

      {/* Resize Handle */}
      <div
        className="h-2 bg-[#1D1D1D] hover:bg-blue-500 cursor-row-resize transition-colors shrink-0 relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-16 h-1 bg-current rounded-full opacity-50" />
      </div>
    </div>
  );
}