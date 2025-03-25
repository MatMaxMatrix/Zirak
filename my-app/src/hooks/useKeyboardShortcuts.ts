import { useEffect, useCallback } from 'react';
import { FileSystem } from '@/types/chat';

interface KeyboardShortcutProps {
  selectedFile: FileSystem | null;
  onDelete?: (file: FileSystem) => Promise<void>;
  onCopy?: (file: FileSystem) => void;
  onCut?: (file: FileSystem) => void;
  onPaste?: (targetDir: FileSystem) => Promise<void>;
  onRename?: (file: FileSystem) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onRefresh?: () => Promise<void>;
  disableShortcuts?: boolean;
}

export function useKeyboardShortcuts({
  selectedFile,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onNewFile,
  onNewFolder,
  onRefresh,
  disableShortcuts = false
}: KeyboardShortcutProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if shortcuts are disabled
    if (disableShortcuts) return;
    
    // Skip if we're in an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }
    
    const isMetaOrCtrl = e.metaKey || e.ctrlKey;
    
    // Handle file operations
    if (selectedFile) {
      // Delete: Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        e.preventDefault();
        onDelete(selectedFile);
      }
      
      // Copy: Ctrl+C or Cmd+C
      if (isMetaOrCtrl && e.key === 'c' && onCopy) {
        e.preventDefault();
        onCopy(selectedFile);
      }
      
      // Cut: Ctrl+X or Cmd+X
      if (isMetaOrCtrl && e.key === 'x' && onCut) {
        e.preventDefault();
        onCut(selectedFile);
      }
      
      // Paste: Ctrl+V or Cmd+V (but only for directories)
      if (isMetaOrCtrl && e.key === 'v' && onPaste && selectedFile.type === 'directory') {
        e.preventDefault();
        onPaste(selectedFile);
      }
      
      // Rename: F2
      if (e.key === 'F2' && onRename) {
        e.preventDefault();
        onRename(selectedFile);
      }
    }
    
    // New file: Ctrl+N or Cmd+N
    if (isMetaOrCtrl && e.key === 'n' && onNewFile) {
      e.preventDefault();
      onNewFile();
    }
    
    // New folder: Ctrl+Shift+N or Cmd+Shift+N
    if (isMetaOrCtrl && e.shiftKey && e.key === 'N' && onNewFolder) {
      e.preventDefault();
      onNewFolder();
    }
    
    // Refresh: F5
    if (e.key === 'F5' && onRefresh) {
      e.preventDefault();
      onRefresh();
    }
  }, [selectedFile, onDelete, onCopy, onCut, onPaste, onRename, onNewFile, onNewFolder, onRefresh, disableShortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
} 