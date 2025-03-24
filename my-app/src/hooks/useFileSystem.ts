import { useState } from 'react';
import { FileSystem } from '@/app/contexts/WebSocketContext';
import { fetchFileSystem } from '@/lib/chat-utils';

// Define Project interface
interface Project {
  id: string;
  name: string;
  path: string;
  lastAccessed: string;
  config?: {
    description: string;
    type: string;
    language: string;
    framework?: string;
  };
}

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
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

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
      if (result.fileSystem) {
        // Ensure we're getting a valid file system structure
        const validFileSystem = result.fileSystem.map((item: FileSystem) => ({
          ...item,
          expanded: item.type === 'directory' ? true : undefined,
          children: item.children || []
        }));
        setFileSystem(validFileSystem);
      }
    } catch (error) {
      console.error('Failed to refresh file system:', error);
      // If the first attempt fails, try again after a short delay
      setTimeout(async () => {
        try {
          const result = await fetchFileSystem();
          if (result.fileSystem) {
            // Ensure we're getting a valid file system structure
            const validFileSystem = result.fileSystem.map((item: FileSystem) => ({
              ...item,
              expanded: item.type === 'directory' ? true : undefined,
              children: item.children || []
            }));
            setFileSystem(validFileSystem);
          }
        } catch (error) {
          console.error('Failed to refresh file system after retry:', error);
        }
      }, 100);
    }
  };

  // Handle project selection
  const handleProjectSelect = async (project: Project) => {
    console.log('Selecting project:', project);
    setCurrentProject(project);
    
    try {
      // Update working directory in terminal via API
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: `cd ${project.name}`,
          userId: 'default_user'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error switching project:', error);
    }
  };

  // Handle project creation
  const handleCreateProject = async (project: Project) => {
    console.log('Creating new project:', project);
    
    try {
      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: project.name,
          config: project.config
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { project: newProject } = await response.json();
      
      // Set as current project
      setCurrentProject(newProject);
      
      // Change to the new project directory
      await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: `cd ${newProject.name}`,
          userId: 'default_user'
        }),
      });
      
      // Refresh file system for the new project
      await refreshFileSystem();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return {
    fileSystem,
    setFileSystem,
    selectedFile,
    setSelectedFile,
    toggleDirectory,
    selectFile,
    refreshFileSystem,
    currentProject,
    handleProjectSelect,
    handleCreateProject
  };
} 