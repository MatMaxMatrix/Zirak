import { useState } from 'react';
import { FileSystem } from '@/types/chat';

interface FileOperationsProps {
  refreshFileSystem: () => Promise<void>;
}

export function useFileOperations({ refreshFileSystem }: FileOperationsProps) {
  // State for copy/paste operations
  const [copiedFile, setCopiedFile] = useState<FileSystem | null>(null);
  const [cutFile, setCutFile] = useState<FileSystem | null>(null);
  
  // Handle file deletion
  const deleteFile = async (file: FileSystem): Promise<boolean> => {
    try {
      const isDirectory = file.type === 'directory';
      const command = isDirectory ? `rm -rf "${file.path}"` : `rm "${file.path}"`;
      
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      if (!response.ok) {
        console.error('Failed to delete', isDirectory ? 'directory' : 'file');
        return false;
      }
      
      // Refresh the file system
      await refreshFileSystem();
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  };
  
  // Handle file/directory renaming
  const renameFile = async (file: FileSystem, newName: string): Promise<boolean> => {
    try {
      const oldPath = file.path;
      const lastSlashIndex = oldPath.lastIndexOf('/');
      const parentDir = lastSlashIndex >= 0 ? oldPath.substring(0, lastSlashIndex) : '';
      const newPath = parentDir ? `${parentDir}/${newName}` : newName;
      
      // Execute the rename command via the terminal API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `mv "${oldPath}" "${newPath}"`
        })
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Refresh the file system after renaming
      await refreshFileSystem();
      return true;
    } catch (error) {
      console.error('Error renaming file:', error);
      return false;
    }
  };
  
  // Handle file/directory creation
  const createFile = async (
    path: string, 
    name: string, 
    isDirectory: boolean
  ): Promise<boolean> => {
    try {
      // Construct the full path, handling special cases
      let targetPath = name;
      if (path) {
        // Ensure path has trailing slash
        const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
        targetPath = `${pathWithSlash}${name}`;
      }
      
      const command = isDirectory ? 
        `mkdir -p "${targetPath}"` : 
        `touch "${targetPath}"`;
      
      // Execute the command via the terminal API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Refresh the file system
      await refreshFileSystem();
      return true;
    } catch (error) {
      console.error('Error creating item:', error);
      return false;
    }
  };
  
  // Handle copying a file for later paste
  const copyFile = (file: FileSystem) => {
    setCopiedFile(file);
    setCutFile(null);
  };
  
  // Handle cutting a file for later paste
  const handleCutFile = (file: FileSystem) => {
    setCutFile(file);
    setCopiedFile(null);
  };
  
  // Handle pasting a previously copied/cut file
  const pasteFile = async (targetDir: FileSystem): Promise<boolean> => {
    try {
      if (!copiedFile && !cutFile) return false;
      
      const sourceFile = copiedFile || cutFile;
      if (!sourceFile) return false;
      
      const fileName = sourceFile.name;
      const targetPath = `${targetDir.path}/${fileName}`;
      const sourcePath = sourceFile.path;
      
      // Don't paste into itself
      if (targetPath === sourcePath) return false;
      
      // Copy or move command depending on if it was cut or copied
      const isMove = !!cutFile;
      const command = isMove
        ? `mv "${sourcePath}" "${targetPath}"` 
        : `cp -r "${sourcePath}" "${targetPath}"`;
      
      // Execute the command via the terminal API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Reset cut file state if it was a move operation
      if (isMove) {
        setCutFile(null);
      }
      
      // Refresh the file system
      await refreshFileSystem();
      return true;
    } catch (error) {
      console.error('Error pasting file:', error);
      return false;
    }
  };
  
  // Move a file or directory to a target directory
  const moveFile = async (source: FileSystem, targetDir: FileSystem): Promise<boolean> => {
    try {
      const fileName = source.name;
      const targetPath = `${targetDir.path}/${fileName}`;
      const sourcePath = source.path;
      
      // Don't move to itself or to a subdirectory
      if (targetPath === sourcePath || 
          (source.type === 'directory' && targetPath.startsWith(sourcePath + '/'))) {
        return false;
      }
      
      // Move command
      const command = `mv "${sourcePath}" "${targetPath}"`;
      
      // Execute the command via the terminal API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Refresh the file system
      await refreshFileSystem();
      return true;
    } catch (error) {
      console.error('Error moving file:', error);
      return false;
    }
  };
  
  // Download a file
  const downloadFile = async (file: FileSystem): Promise<boolean> => {
    try {
      if (file.type === 'directory') {
        console.error('Cannot download directories directly');
        return false;
      }
      
      // Fetch the file content from the server
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(file.path)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      if (!data.file || !data.file.content) {
        return false;
      }
      
      // Create a Blob and download it
      const blob = new Blob([data.file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error downloading file:', error);
      return false;
    }
  };
  
  // Compare two files
  const compareFiles = async (file1Path: string, file2Path: string): Promise<any> => {
    try {
      const response = await fetch(`/api/filesystem/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file1: file1Path,
          file2: file2Path
        })
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error comparing files:', error);
      return null;
    }
  };
  
  return {
    // State
    copiedFile,
    cutFile,
    
    // Operations
    deleteFile,
    renameFile,
    createFile,
    copyFile,
    handleCutFile,
    pasteFile,
    moveFile,
    downloadFile,
    compareFiles,
    
    // Helper to check if we have a file for paste
    hasCopiedFile: !!copiedFile,
    hasCutFile: !!cutFile,
    
    // Clear any pending operations
    clearClipboard: () => {
      setCopiedFile(null);
      setCutFile(null);
    }
  };
} 