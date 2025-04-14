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
      
      currentWidth = Math.max(20, Math.min(80, currentWidth + deltaPercentage));
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

// Create vertical resize handler for terminal panel (bottom-up resizing)
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
      // For terminal, dragging up (negative deltaY) should increase height
      // This creates the bottom-up effect
      const deltaY = isTerminal 
        ? startY - e.clientY  // Terminal: drag up → larger, drag down → smaller
        : e.clientY - startY; // Editor: drag down → larger, drag up → smaller
      
      // Calculate new height based on direction
      const newHeight = isTerminal
        ? initialHeight + deltaY 
        : initialHeight + deltaY;
      
      // Use different limits for terminal vs editor
      const maxHeight = isTerminal ? 800 : 800;
      const minHeight = isTerminal ? 100 : 150;
      
      const limitedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      setHeight(limitedHeight);
    });
  };
  
  const handleMouseUp = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Remove resize class from body
    document.body.classList.remove('resize-active');
  };
  
  // Add resize class to body
  document.body.classList.add('resize-active');
  
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

/**
 * Function to detect and diagnose potential WebSocket connectivity issues
 * @returns Object with information about the connection environment
 */
export function diagnoseWebSocketIssues() {
  const diagnostics = {
    secure: false,
    proxy: false,
    firewall: false,
    cors: false,
    supportLevel: 'unknown',
    portBlocked: false,
    suggestions: [] as string[]
  };

  // Check if we're on https
  diagnostics.secure = window.location.protocol === 'https:';
  if (!diagnostics.secure) {
    diagnostics.suggestions.push('Connection is not secure (HTTP). Some browsers restrict WebSockets on insecure connections.');
  }

  // Check for WebSocket support
  if ('WebSocket' in window) {
    try {
      // Test creating a WebSocket instance
      const testSocket = new WebSocket('wss://echo.websocket.org');
      testSocket.onopen = () => {
        console.log('General WebSocket test successful');
        testSocket.close();
      };
      testSocket.onerror = () => {
        console.log('General WebSocket test failed');
        diagnostics.supportLevel = 'limited';
        diagnostics.suggestions.push('Your browser/network appears to have limited WebSocket support.');
      };
      diagnostics.supportLevel = 'full';
    } catch (e) {
      diagnostics.supportLevel = 'limited';
      diagnostics.suggestions.push('Error creating test WebSocket. Your environment may have restricted WebSocket usage.');
    }
  } else {
    diagnostics.supportLevel = 'none';
    diagnostics.suggestions.push('WebSockets are not supported in this browser.');
  }

  // Check if we're running on localhost and backend port is accessible
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Test connectivity to the backend port using a fetch
    fetch('http://localhost:5001/health', { mode: 'no-cors' })
      .catch(() => {
        diagnostics.portBlocked = true;
        diagnostics.suggestions.push('Cannot connect to backend server port (5001). Make sure your backend server is running.');
      });
  } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // In production, assume backend is at api.zirak.dev
    fetch('https://api.zirak.dev/health', { mode: 'no-cors' })
      .catch(() => {
        diagnostics.portBlocked = true;
        diagnostics.suggestions.push('Cannot connect to backend API server. Please check your network connection.');
      });
  }

  // Detect potential proxy issues
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Check for common proxy headers
    fetch('/api/headers')
      .then(response => response.json())
      .then(headers => {
        if (
          headers['x-forwarded-for'] ||
          headers['x-forwarded-host'] ||
          headers['x-forwarded-proto']
        ) {
          diagnostics.proxy = true;
          diagnostics.suggestions.push('Your connection appears to be going through a proxy, which might affect WebSockets.');
        }
      })
      .catch(() => {
        // Silently fail
      });
  }

  // Detect common browser extensions that might interfere
  // @ts-ignore - check for ad blockers
  if (window.adBlockAnalyticsLoaded || window.google_ad_status === 1) {
    diagnostics.suggestions.push('Ad-blocking extensions detected which might interfere with WebSocket connections.');
  }

  // Check for service workers that might interfere
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    diagnostics.suggestions.push('Service worker active - this might interfere with WebSocket connections in some browsers.');
  }

  // CORS detection is challenging, but we can look for symptoms
  try {
    // Try to connect to backend using WebSocket directly
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:5001' 
        : 'https://api.zirak.dev';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${backendUrl.replace(/^https?:\/\//, '')}/socket.io/?transport=websocket`;
    
    console.log('Testing direct WebSocket connection to:', wsUrl);
    
    const testWs = new WebSocket(wsUrl);
    testWs.onopen = () => {
      console.log('Direct WebSocket test connection succeeded');
      testWs.close();
    };
    testWs.onerror = (error) => {
      console.error('Direct WebSocket test connection failed:', error);
      diagnostics.cors = true;
      diagnostics.suggestions.push('Direct WebSocket connection to backend failed. This could be due to CORS, firewall restrictions, or the server not being available.');
    };
  } catch (e) {
    console.error('Error testing direct WebSocket connection:', e);
    diagnostics.cors = true;
    diagnostics.suggestions.push('Unable to test WebSocket connection. This might indicate restrictive browser security policies or connection issues.');
  }

  // Standard advice for WebSocket issues
  diagnostics.suggestions.push('Try using polling instead of WebSockets by refreshing and quickly pressing reconnect.');
  
  return diagnostics;
} 