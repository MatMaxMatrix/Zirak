import { useState } from 'react';
import { FileSystem } from '@/app/contexts/WebSocketContext';
import { fetchFileSystem } from '@/lib/chat-utils';

export function useFileSystem() {
  const [fileSystem, setFileSystem] = useState<FileSystem[]>([
    {
      name: 'project',
      type: 'directory',
      path: '/project',
      expanded: true,
      children: [
        {
          name: 'README.md',
          type: 'file',
          path: '/project/README.md',
          content: '# Project\n\nThis is a sample project.'
        }
      ]
    }
  ]);
  const [selectedFile, setSelectedFile] = useState<FileSystem | null>(null);

  // Toggle directory expansion
  const toggleDirectory = (path: string) => {
    setFileSystem(prevFiles => {
      const newFiles = [...prevFiles];
      
      const toggleDir = (items: FileSystem[]) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].path === path && items[i].type === 'directory') {
            items[i] = { ...items[i], expanded: !items[i].expanded };
            return true;
          }
          
          // Check if children exists and is an array before trying to iterate
          if (items[i].children) {
            const children = items[i].children;
            if (children && children.length > 0) {
              if (toggleDir(children)) {
                return true;
              }
            }
          }
        }
        
        return false;
      };
      
      toggleDir(newFiles);
      return newFiles;
    });
  };

  // Select a file to view its contents
  const selectFile = (file: FileSystem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  };

  // Refresh the file system
  const refreshFileSystem = async () => {
    try {
      const result = await fetchFileSystem();
      setFileSystem(result.fileSystem);
    } catch (error) {
      console.error('Failed to refresh file system:', error);
    }
  };

  return {
    fileSystem,
    setFileSystem,
    selectedFile,
    setSelectedFile,
    toggleDirectory,
    selectFile,
    refreshFileSystem
  };
} 