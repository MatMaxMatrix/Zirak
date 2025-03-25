import { useState, useEffect } from 'react';
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

  // Refresh the file system with cache-busting
  const refreshFileSystem = async () => {
    try {
      // Add a timestamp to prevent browser/Next.js caching
      const timestamp = new Date().getTime();
      const result = await fetch(`/api/filesystem?_ts=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      });
      
      if (result && result.fileSystem) {
        // Ensure we're getting a valid file system structure
        const validFileSystem = result.fileSystem.map((item: FileSystem) => ({
          ...item,
          expanded: item.type === 'directory' ? true : undefined,
          children: item.children || []
        }));
        
        // Deep comparison to avoid unnecessary re-renders
        const stringifiedCurrent = JSON.stringify(fileSystem);
        const stringifiedNew = JSON.stringify(validFileSystem);
        
        if (stringifiedCurrent !== stringifiedNew) {
          console.log('File system updated from server');
          setFileSystem(validFileSystem);
        } else {
          console.log('File system unchanged');
        }
        
        return result.fileSystem;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh file system:', error);
      
      // If the first attempt fails, try again after a short delay with different fetch options
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use XMLHttpRequest as a fallback to bypass potential caching issues
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', `/api/filesystem?fallback=true&_ts=${new Date().getTime()}`);
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          xhr.setRequestHeader('Pragma', 'no-cache');
          xhr.setRequestHeader('Expires', '0');
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch (e) {
                reject(new Error('Failed to parse response'));
              }
            } else {
              reject(new Error(`XHR error: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send();
        });
        
        if (data && data.fileSystem) {
          const validFileSystem = data.fileSystem.map((item: FileSystem) => ({
            ...item,
            expanded: item.type === 'directory' ? true : undefined,
            children: item.children || []
          }));
          setFileSystem(validFileSystem);
          return data.fileSystem;
        }
      } catch (fallbackError) {
        console.error('Fallback refresh also failed:', fallbackError);
      }
      
      return null;
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

  // Function to move a file or directory to a new location
  const moveFileOrDirectory = async (sourcePath: string, destinationPath: string): Promise<boolean> => {
    try {
      // Ensure paths are properly formatted
      const normalizedSourcePath = sourcePath
        .startsWith('/project/') 
        ? sourcePath.replace(/\/+/g, '/') 
        : `/project/${sourcePath.replace(/^\/+/, '')}`;
      
      const normalizedDestPath = destinationPath
        .startsWith('/project/') 
        ? destinationPath.replace(/\/+/g, '/') 
        : `/project/${destinationPath.replace(/^\/+/, '')}`;
      
      console.log(`Moving from ${normalizedSourcePath} to ${normalizedDestPath}`);
      
      // Call API to move the file
      const response = await fetch('/api/filesystem/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: normalizedSourcePath,
          destinationPath: normalizedDestPath
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      // Refresh file system to update UI
      await refreshFileSystem();
      
      return true;
    } catch (error) {
      console.error('Failed to move file/directory:', error);
      
      // Refresh to ensure UI is in sync
      refreshFileSystem().catch(refreshError => {
        console.error('Error refreshing after failed move:', refreshError);
      });
      
      return false;
    }
  };
  
  // Function to get content of two files for comparison
  const compareFiles = async (file1Path: string, file2Path: string) => {
    try {
      // Ensure paths are properly formatted
      const normalizedPath1 = file1Path
        .startsWith('/project/') 
        ? file1Path.replace(/\/+/g, '/') 
        : `/project/${file1Path.replace(/^\/+/, '')}`;
      
      const normalizedPath2 = file2Path
        .startsWith('/project/') 
        ? file2Path.replace(/\/+/g, '/') 
        : `/project/${file2Path.replace(/^\/+/, '')}`;
      
      // Fetch content of first file
      const response1 = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath1)}`);
      if (!response1.ok) {
        throw new Error(`Failed to fetch file 1: ${response1.status}`);
      }
      const file1Data = await response1.json();
      
      // Fetch content of second file
      const response2 = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath2)}`);
      if (!response2.ok) {
        throw new Error(`Failed to fetch file 2: ${response2.status}`);
      }
      const file2Data = await response2.json();
      
      return {
        file1: {
          path: normalizedPath1,
          name: normalizedPath1.split('/').pop() || '',
          content: file1Data.file.content
        },
        file2: {
          path: normalizedPath2,
          name: normalizedPath2.split('/').pop() || '',
          content: file2Data.file.content
        }
      };
    } catch (error) {
      console.error('Failed to compare files:', error);
      return null;
    }
  };

  // Function to delete a file or directory
  const deleteFileOrDirectory = async (path: string): Promise<boolean> => {
    try {
      // Ensure the path is properly formatted
      const normalizedPath = path
        .startsWith('/project/') 
        ? path.replace(/\/+/g, '/') 
        : `/project/${path.replace(/^\/+/, '')}`;
      
      console.log('Deleting path:', normalizedPath);
      
      // If this was the selected file, clear selection
      if (selectedFile && selectedFile.path === path) {
        setSelectedFile(null);
      }
      
      // Pre-emptively update the UI with optimistic deletion - immediately remove file from UI
      if (fileSystem) {
        // Create a deep clone of the current fileSystem to avoid reference issues
        const clonedFileSystem = JSON.parse(JSON.stringify(fileSystem));
        
        const removeDeletedItem = (items: FileSystem[]): FileSystem[] => {
          return items
            .filter(item => item.path !== normalizedPath)
            .map(item => {
              if (item.children && item.children.length > 0) {
                return {
                  ...item,
                  children: removeDeletedItem(item.children)
                };
              }
              return item;
            });
        };
        
        // Update state immediately with the file removed
        const updatedFileSystem = removeDeletedItem(clonedFileSystem);
        setFileSystem(updatedFileSystem);
      }
      
      // Execute the actual deletion
      const response = await fetch(`/api/filesystem?path=${encodeURIComponent(normalizedPath)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache-busting query parameter
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
      }
      
      // Force refresh from server to get the latest state after deletion
      try {
        // Add a short delay to ensure server has time to process deletion
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use a timestamp query parameter to prevent caching
        const timestamp = new Date().getTime();
        const refreshResponse = await fetch(`/api/filesystem?_ts=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          if (result && result.fileSystem) {
            const validFileSystem = result.fileSystem.map((item: FileSystem) => ({
              ...item,
              expanded: item.type === 'directory' ? true : undefined,
              children: item.children || []
            }));
            setFileSystem(validFileSystem);
          }
        }
      } catch (refreshError) {
        console.error('Error during forced refresh:', refreshError);
      }
      
      // Schedule another refresh after a delay to ensure consistency
      setTimeout(() => {
        refreshFileSystem().catch(error => {
          console.error('Error during delayed refresh:', error);
        });
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Failed to delete file/directory:', error);
      
      // Refresh to ensure UI is in sync even on failure
      refreshFileSystem().catch(refreshError => {
        console.error('Error refreshing after failed deletion:', refreshError);
      });
      
      return false;
    }
  };

  // Listen for external refreshes
  useEffect(() => {
    // Function to handle filesystem changes from other components
    const handleExternalRefresh = (event: Event) => {
      console.log('External file system change detected');
      const customEvent = event as CustomEvent;
      const { path, action } = customEvent.detail || {};
      
      // For deletions, immediately update the UI state
      if (action === 'delete' && path) {
        setFileSystem(prevState => {
          const removeDeletedItem = (items: FileSystem[]): FileSystem[] => {
            return items
              .filter(item => item.path !== path)
              .map(item => {
                if (item.children && item.children.length > 0) {
                  return {
                    ...item,
                    children: removeDeletedItem(item.children)
                  };
                }
                return item;
              });
          };
          
          return removeDeletedItem([...prevState]);
        });
        
        // If this was the selected file, clear selection
        if (selectedFile && selectedFile.path === path) {
          setSelectedFile(null);
        }
      }
      
      // Refresh from server
      refreshFileSystem().catch(error => {
        console.error('Error refreshing after external change:', error);
      });
    };
    
    // Add event listener for filesystem changes
    window.addEventListener('filesystem-changed', handleExternalRefresh);
    
    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('filesystem-changed', handleExternalRefresh);
    };
  }, [selectedFile]);

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
    handleCreateProject,
    moveFileOrDirectory,
    compareFiles,
    deleteFileOrDirectory
  };
} 