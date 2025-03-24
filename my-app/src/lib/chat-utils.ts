import ReactMarkdown from 'react-markdown';
import { ReactNode } from 'react';
import React from 'react';

// Get color for an agent
export const getAgentColor = (agentName: string): string => {
  const colors = {
    'System': 'text-gray-500',
    'LLM': 'text-blue-500',
    'Assistant': 'text-green-500',
    'UserProxyAgent': 'text-amber-500',
    'ClarificationAgent': 'text-purple-500',
    'LLM_Agent': 'text-blue-500',
    'Step_Generator': 'text-indigo-500'
  };
  
  return colors[agentName as keyof typeof colors] || 'text-gray-500';
};

// Render message content with markdown support
export const renderMessageContent = (content: string): ReactNode => {
  return React.createElement(ReactMarkdown, { children: content });
};

// Create resize handler for horizontal dragging
export const createHorizontalResizeHandler = (
  setWorkspaceWidth: (width: number) => void,
  initialWidth: number,
  startX: number
) => {
  let rafId: number;
  let lastX = startX;
  let currentWidth = initialWidth;

  const handleMouseMove = (e: MouseEvent) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const container = document.querySelector('.chat-workspace-container') as HTMLElement;
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - lastX;
      const deltaPercentage = (deltaX / containerWidth) * 100;
      
      currentWidth = Math.max(20, Math.min(80, currentWidth - deltaPercentage));
      setWorkspaceWidth(currentWidth);
      
      lastX = e.clientX;
    });
  };
  
  const handleMouseUp = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  return {
    handleMouseMove,
    handleMouseUp
  };
};

// Create resize handler for vertical dragging
export const createVerticalResizeHandler = (
  setHeight: (height: number) => void,
  initialHeight: number,
  startY: number,
  isTerminal: boolean = true
) => {
  let rafId: number;
  let lastY = startY;
  let currentHeight = initialHeight;

  const handleMouseMove = (e: MouseEvent) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const deltaY = isTerminal ? lastY - e.clientY : e.clientY - lastY;
      currentHeight = currentHeight + deltaY;
      
      // Use different limits for terminal vs editor
      const maxHeight = isTerminal ? 500 : 800;
      const limitedHeight = Math.max(100, Math.min(currentHeight, maxHeight));
      setHeight(limitedHeight);
      
      lastY = e.clientY;
    });
  };
  
  const handleMouseUp = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  return {
    handleMouseMove,
    handleMouseUp
  };
};

// Fetch updated file system
export const fetchFileSystem = async (): Promise<any> => {
  try {
    const response = await fetch('/api/filesystem', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch file system:', error);
    throw error;
  }
}; 