import { useState, useRef } from 'react';
import { createHorizontalResizeHandler, createVerticalResizeHandler } from '@/lib/chat-utils';

export function useResizing() {
  // State for resizing panels
  const [workspaceWidth, setWorkspaceWidth] = useState(50); // 50% as default
  const [terminalHeight, setTerminalHeight] = useState(130);
  const [editorHeight, setEditorHeight] = useState(300); // Default height
  
  // Handle horizontal resizing for the workspace panel
  const handleHorizontalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Get initial position
    const startX = e.clientX;
    
    // Set up handlers
    const { handleMouseMove, handleMouseUp } = createHorizontalResizeHandler(
      setWorkspaceWidth,
      workspaceWidth,
      startX
    );
    
    // Add the handlers to document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle vertical resizing for the terminal panel
  const handleTerminalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Get initial position
    const startY = e.clientY;
    
    // Set up handlers
    const { handleMouseMove, handleMouseUp } = createVerticalResizeHandler(
      setTerminalHeight,
      terminalHeight,
      startY,
      true // is terminal
    );
    
    // Add the handlers to document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle vertical resizing for the editor panel
  const handleEditorMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Get initial position
    const startY = e.clientY;
    
    // Set up handlers
    const { handleMouseMove, handleMouseUp } = createVerticalResizeHandler(
      setEditorHeight,
      editorHeight,
      startY,
      false // not terminal
    );
    
    // Add the handlers to document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return {
    workspaceWidth,
    setWorkspaceWidth,
    terminalHeight,
    setTerminalHeight,
    editorHeight,
    setEditorHeight,
    handleHorizontalMouseDown,
    handleTerminalMouseDown,
    handleEditorMouseDown
  };
} 