'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface WorkflowStep {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
  status: 'complete' | 'active' | 'waiting' | 'error';
}

export interface FileSystem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystem[];
  expanded?: boolean;
  content?: string;
}

export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  error?: string;
  exitCode?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalUsed: number;
  maxTokens: number;
}

export interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  messages: Message[];
  activeWorkflowId: string | null;
  workflowSteps: WorkflowStep[];
  tokenUsage: TokenUsage | null;
  fileSystem: FileSystem[];
  terminal: TerminalCommand[];
  inputRequired: boolean;
  inputPrompt: string | null;
  waitingForUserInput: boolean;
  sendMessage: (message: string) => void;
  sendUserInputResponse: (response: string) => void;
  updateFileSystem: (fileSystem: FileSystem[]) => void;
  addTerminalCommand: (command: TerminalCommand) => void;
  updateTerminalCommand: (command: TerminalCommand) => void;
  updateLastTerminalCommand: (partialCommand: Partial<TerminalCommand>) => void;
  clearTerminal: () => void;
  workingDirectory: string;
  setWorkingDirectory: (path: string) => void;
  refreshConnection: () => void;
  backendMissing: boolean;
  connectionAttempted: boolean;
  savingFromEditor: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  messages: [],
  activeWorkflowId: null,
  workflowSteps: [],
  tokenUsage: null,
  fileSystem: [],
  terminal: [],
  inputRequired: false,
  inputPrompt: null,
  waitingForUserInput: false,
  sendMessage: () => {},
  sendUserInputResponse: () => {},
  updateFileSystem: () => {},
  addTerminalCommand: () => {},
  updateTerminalCommand: () => {},
  updateLastTerminalCommand: () => {},
  clearTerminal: () => {},
  workingDirectory: '/project',
  setWorkingDirectory: () => {},
  refreshConnection: () => {},
  backendMissing: false,
  connectionAttempted: false,
  savingFromEditor: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [fileSystem, setFileSystem] = useState<FileSystem[]>([]);
  const [terminal, setTerminal] = useState<TerminalCommand[]>([]);
  const [inputRequired, setInputRequired] = useState(false);
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const [waitingForUserInput, setWaitingForUserInput] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState('/project');
  const [backendMissing, setBackendMissing] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const savingFromEditor = false; // kept for API compatibility

  // Use a ref for the initialised flag so toggling it never causes re-renders
  // and the useEffect dependencies stay stable.
  const initializedRef = useRef(false);

  // Stable session key — lives in localStorage so it survives page refreshes.
  // The backend keys conversation history by this value, not the socket sid.
  const sessionKeyRef = useRef<string>('');

  const _getOrCreateSessionKey = (): string => {
    if (typeof window === 'undefined') return '';
    let key = localStorage.getItem('zirak_session_key');
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem('zirak_session_key', key);
    }
    return key;
  };

  // ── Socket initialisation (called once) ───────────────────────────────────

  const initializeSocket = useCallback(() => {
    if (initializedRef.current || typeof window === 'undefined') return;
    initializedRef.current = true;
    setConnectionAttempted(true);
    sessionKeyRef.current = _getOrCreateSessionKey();

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5001'
        : `https://${window.location.hostname}:5001`);

    console.log('[Socket] Connecting to', backendUrl);

    const socketInstance = io(backendUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: false,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 45000,       // increased — backend can be slow to start
      forceNew: true,
      path: '/socket.io/',
    });

    // ── Connection events ────────────────────────────────────────────────────

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected, transport:', socketInstance.io.engine.transport.name);
      setConnected(true);
      setBackendMissing(false);
      // Register stable session key so the backend can resume history on reconnect
      socketInstance.emit('join_session', { session_key: sessionKeyRef.current });
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      setConnected(false);
      // 'io server disconnect' means the server explicitly closed us — reconnect manually.
      if (reason === 'io server disconnect') socketInstance.connect();
      // Don't spam "reconnecting" messages for normal transient disconnects;
      // socket.io auto-reconnects and will fire 'reconnect' when it succeeds.
    });

    socketInstance.on('connect_error', (error) => {
      // Transient timeouts/network blips are normal during reconnection — log as
      // info so they don't pollute the console as unhandled errors.
      console.info('[Socket] Connection attempt failed:', error.message, '— retrying…');
      setConnected(false);
    });

    // Socket.IO v4: reconnect events live on the Manager (socket.io), not the socket.
    socketInstance.io.on('reconnect', (attemptNumber: number) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      setConnected(true);
    });

    socketInstance.io.on('reconnect_failed', () => {
      console.error('[Socket] Failed to reconnect after many attempts');
      setBackendMissing(true);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Could not reach the server. Please check the backend and refresh the page.',
        timestamp: new Date().toISOString(),
      }]);
    });

    // ── Backend acknowledgement ──────────────────────────────────────────────

    socketInstance.on('connected', (data: { status: string }) => {
      console.log('[Socket] Server ack:', data);
    });

    // ── Session history restore (on reconnect / page refresh) ────────────────
    socketInstance.on('session_history', (data: {
      session_key: string;
      history: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: string; agent: string }>;
    }) => {
      if (data.history && data.history.length > 0) {
        console.log(`[Socket] Restoring ${data.history.length} messages from session history`);
        setMessages(data.history);
      }
    });

    // ── Workflow events ──────────────────────────────────────────────────────

    socketInstance.on('workflow_started', (data: { workflow_id: string; message: string }) => {
      console.log('Workflow started:', data);
      setActiveWorkflowId(data.workflow_id);
      // Clear previous steps and token usage so each new turn starts fresh
      setWorkflowSteps([]);
      setTokenUsage(null);
    });

    socketInstance.on('token_usage_update', (data: {
      workflow_id: string;
      prompt_tokens: number;
      completion_tokens: number;
      total_used: number;
      max_tokens: number;
    }) => {
      setTokenUsage({
        promptTokens: data.prompt_tokens,
        completionTokens: data.completion_tokens,
        totalUsed: data.total_used,
        maxTokens: data.max_tokens,
      });
    });

    // agent_message: only update the workflow step panel.
    // Message content is already shown via conversation_update — adding it here
    // again with crypto.randomUUID() would create duplicate chat bubbles.
    socketInstance.on('agent_message', (data: {
      agent: string;
      message: string;
      timestamp?: string;
      workflow_step?: WorkflowStep;
    }) => {
      if (data.workflow_step) {
        setWorkflowSteps(prev => {
          const step = data.workflow_step!;
          const exists = prev.some(s => s.id === step.id);
          return exists ? prev.map(s => s.id === step.id ? step : s) : [...prev, step];
        });
      }
    });

    socketInstance.on('workflow_update', (data: {
      step?: WorkflowStep;
      fileSystem?: FileSystem[];
      terminal?: { command: string; output: string; timestamp?: string };
    }) => {
      if (data.step) {
        setWorkflowSteps(prev => {
          const step = data.step!;
          const exists = prev.some(s => s.id === step.id);
          return exists ? prev.map(s => s.id === step.id ? step : s) : [...prev, step];
        });
      }
      if (data.fileSystem) setFileSystem(data.fileSystem);
      if (data.terminal) {
        const t = data.terminal;
        setTerminal(prev => [...prev, {
          id: crypto.randomUUID(),
          command: t.command,
          output: t.output,
          timestamp: t.timestamp || new Date().toISOString(),
        }]);
      }
    });

    socketInstance.on('conversation_update', (data: {
      workflow_id: string;
      message: {
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
        agent: string;
      };
    }) => {
      const msg = data.message;
      // Suppress internal noise phrases
      const suppressedPhrases = ['Workflow started.', 'Processing…'];
      if (msg.role === 'system' && suppressedPhrases.some(p => msg.content === p)) return;

      // conversation_update feeds the CHAT only.
      // Workflow panel is driven by workflow_update / agent_message events.
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socketInstance.on('user_input_required', (data: { workflow_id: string; prompt: string }) => {
      setInputRequired(true);
      setInputPrompt(data.prompt);
      setWaitingForUserInput(true);
    });

    socketInstance.on('user_input_received', () => {
      setInputRequired(false);
      setInputPrompt('');
      setWaitingForUserInput(false);
    });

    socketInstance.on('workflow_completed', (data: {
      workflow_id: string;
      result: string;
    }) => {
      console.log('[Socket] Workflow completed:', data.workflow_id);
      setWaitingForUserInput(false);
      setInputRequired(false);
      // Clear workflow steps — the panel goes back to idle state after completion
      setWorkflowSteps([]);
    });

    socketInstance.on('workflow_error', (data: { workflow_id: string; error: string }) => {
      console.error('Workflow error:', data);
      setWaitingForUserInput(false);
      setInputRequired(false);
      setWorkflowSteps(prev => [...prev, {
        id: crypto.randomUUID(),
        agent: 'System',
        message: `Error: ${data.error}`,
        timestamp: new Date().toISOString(),
        status: 'error',
      }]);
    });

    setSocket(socketInstance);
  // Empty dep array — socket is only initialised once per mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── One-time mount trigger ─────────────────────────────────────────────────

  useEffect(() => {
    initializeSocket();
    // No cleanup — we intentionally keep the socket alive for the provider lifetime.
  }, [initializeSocket]);

  // ── Network / visibility recovery ─────────────────────────────────────────
  // Only trigger reconnects from explicit signals (back online, page visible).
  // Do NOT call refreshConnection on every render — that's what caused the loop.

  useEffect(() => {
    const handleOnline = () => {
      if (socket && !socket.connected) {
        console.log('[Socket] Network back online, reconnecting');
        socket.connect();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket && !socket.connected) {
        console.log('[Socket] Page visible, reconnecting');
        socket.connect();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [socket]); // re-bind if socket instance changes

  // ── Public methods ─────────────────────────────────────────────────────────

  const refreshConnection = useCallback(() => {
    if (backendMissing) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Backend server appears to be offline. Please start the server and refresh the page.',
        timestamp: new Date().toISOString(),
      }]);
      return;
    }
    if (socket) {
      if (!socket.connected) socket.connect();
    } else {
      // No socket yet — re-initialise
      initializedRef.current = false;
      initializeSocket();
    }
  }, [socket, backendMissing, initializeSocket]);

  const sendMessage = useCallback((message: string) => {
    if (!socket || !socket.connected) {
      console.warn('[Socket] Not connected, cannot send message.');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Not connected to the server. Please wait a moment and try again.',
        timestamp: new Date().toISOString(),
      }]);
      if (socket) socket.connect();
      return;
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }]);

    socket.emit('message', { message, workflow_id: activeWorkflowId });
  }, [socket, activeWorkflowId]);

  const sendUserInputResponse = useCallback((response: string) => {
    if (socket && connected && activeWorkflowId && inputRequired) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: response,
        timestamp: new Date().toISOString(),
      }]);
      socket.emit('user_input_response', { workflow_id: activeWorkflowId, response });
    }
  }, [socket, connected, activeWorkflowId, inputRequired]);

  const updateFileSystem = useCallback((fs: FileSystem[]) => setFileSystem(fs), []);

  const addTerminalCommand = useCallback((command: TerminalCommand) => {
    setTerminal(prev => {
      if (command.command.startsWith('# Refresh') || command.command === '# Refreshed file system') {
        return prev;
      }
      const last = prev[prev.length - 1];
      if (last &&
          last.command === command.command &&
          Math.abs(new Date(last.timestamp).getTime() - new Date(command.timestamp).getTime()) < 100) {
        return prev;
      }
      return [...prev, command];
    });
  }, []);

  const updateTerminalCommand = useCallback((updated: TerminalCommand) => {
    setTerminal(prev => prev.map(cmd => cmd.id === updated.id ? updated : cmd));
  }, []);

  const updateLastTerminalCommand = useCallback((partial: Partial<TerminalCommand>) => {
    setTerminal(prev => {
      if (!prev.length) return prev;
      const last = { ...prev[prev.length - 1], ...partial };
      return [...prev.slice(0, -1), last];
    });
  }, []);

  const clearTerminal = useCallback(() => setTerminal([]), []);

  // ── Provider ───────────────────────────────────────────────────────────────

  return (
    <WebSocketContext.Provider value={{
      socket,
      connected,
      messages,
      activeWorkflowId,
      workflowSteps,
      tokenUsage,
      fileSystem,
      terminal,
      inputRequired,
      inputPrompt,
      waitingForUserInput,
      sendMessage,
      sendUserInputResponse,
      updateFileSystem,
      addTerminalCommand,
      updateTerminalCommand,
      updateLastTerminalCommand,
      clearTerminal,
      workingDirectory,
      setWorkingDirectory,
      refreshConnection,
      backendMissing,
      connectionAttempted,
      savingFromEditor,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
