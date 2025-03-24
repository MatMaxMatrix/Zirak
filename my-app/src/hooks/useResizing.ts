import { useState, useRef, useEffect } from 'react';
import { createHorizontalResizeHandler, createVerticalResizeHandler } from '@/lib/chat-utils';

// Create vertical resize handler for the terminal panel
const createOptimizedVerticalResizeHandler = (
  setter: (height: number) => void,
  initialHeight: number,
  startY: number,
  elementRef: React.RefObject<HTMLElement> | null,
  isUp: boolean = false,
  minHeight: number = 100,
  maxHeight: number = 500
) => {
  let rafId: number | null = null;
  let lastY = startY;
  let currentHeight = initialHeight;

  const handleMouseMove = (e: MouseEvent) => {
    // Cancel previous animation frame to avoid stacking updates
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    // Schedule update in animation frame for better performance
    rafId = requestAnimationFrame(() => {
      // Calculate delta based on direction (up or down)
      const deltaY = isUp ? lastY - e.clientY : e.clientY - lastY;
      currentHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight + deltaY));
      
      // Apply directly to DOM for immediate feedback if element reference is provided
      if (elementRef?.current) {
        elementRef.current.style.height = `${currentHeight}px`;
      }
      
      // Update state for React
      setter(currentHeight);
      
      // Save current position for next delta calculation
      lastY = e.clientY;
    });
  };
  
  const handleMouseUp = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    // Make sure the final state is updated
    setter(currentHeight);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Remove any resize-specific CSS classes
    document.body.classList.remove('resize-active');
  };
  
  // Add CSS class to prevent text selection during resize
  document.body.classList.add('resize-active');
  
  return {
    handleMouseMove,
    handleMouseUp
  };
};

export function useResizing() {
  // Calculate initial terminal height based on screen height
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  
  // Calculate terminal height as 30% of screen height (increased from 20%)
  const initialTerminalHeight = Math.round(windowHeight * 0.3); 
  
  // State for resizing panels
  const [workspaceWidth, setWorkspaceWidth] = useState(50); // 50% as default
  const [fileExplorerWidth, setFileExplorerWidth] = useState(250); // Default width in pixels
  const [terminalHeight, setTerminalHeight] = useState(initialTerminalHeight);
  const [editorHeight, setEditorHeight] = useState(300); // Default height
  
  // Refs for direct DOM manipulation
  const terminalRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Update window height on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update terminal height when window height changes
  useEffect(() => {
    const newTerminalHeight = Math.round(windowHeight * 0.3);
    if (newTerminalHeight !== terminalHeight) {
      setTerminalHeight(newTerminalHeight);
    }
  }, [windowHeight]);
  
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
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add class to prevent text selection
    document.body.classList.add('resize-active');
  };

  // Handle horizontal resizing for the file explorer
  const handleFileExplorerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const startX = e.clientX;
    const startWidth = fileExplorerWidth;
    let rafId: number | null = null;
    let currentWidth = startWidth;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        currentWidth = Math.max(150, Math.min(500, startWidth + deltaX));
        setFileExplorerWidth(currentWidth);
      });
    };
    
    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('resize-active');
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
      true // is terminal (resize up)
    );
    
    // Add the handlers to document
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
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
      false // not terminal (resize down)
    );
    
    // Add the handlers to document
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return {
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
  };
} 