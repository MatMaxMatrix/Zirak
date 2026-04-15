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
  // Start empty — will be populated by the backend on first load
  const [fileSystem, setFileSystem] = useState<FileSystem[]>([]);
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

  // Refresh the file system by fetching from the Flask backend workspace endpoint.
  const refreshFileSystem = async () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5001'
        : typeof window !== 'undefined'
        ? `https://${window.location.hostname}:5001`
        : 'http://localhost:5001');

    try {
      const result = await fetch(`${backendUrl}/api/workspace/files?_ts=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });

      if (result && result.fileSystem) {
        const validFileSystem = result.fileSystem.map((item: FileSystem) => ({
          ...item,
          expanded: item.type === 'directory' ? true : undefined,
          children: item.children || [],
        }));

        // Preserve expanded state from current file system
        const transferExpandedState = (newItems: FileSystem[], currentItems: FileSystem[]) => {
          for (const newItem of newItems) {
            const currentItem = currentItems.find(item => item.path === newItem.path);
            if (currentItem && newItem.type === 'directory') {
              newItem.expanded = currentItem.expanded;
            }
            if (newItem.children && currentItem?.children) {
              transferExpandedState(newItem.children, currentItem.children);
            }
          }
        };
        transferExpandedState(validFileSystem, fileSystem);

        const stringifiedCurrent = JSON.stringify(fileSystem);
        const stringifiedNew = JSON.stringify(validFileSystem);
        if (stringifiedCurrent !== stringifiedNew) {
          console.log('[FileSystem] Updated from workspace');
          setFileSystem(validFileSystem);
        }
        return result.fileSystem;
      }
      return null;
    } catch (error) {
      console.error('[FileSystem] Failed to refresh from backend:', error);
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

  // Load workspace from backend on mount
  useEffect(() => {
    refreshFileSystem().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    
    // Handle file selection reset after save
    const handleResetFileSelection = (event: Event) => {
      console.log('Reset file selection after save/close');
      const customEvent = event as CustomEvent;
      const { action } = customEvent.detail || {};
      
      // Clear the selected file to enable navigation to other files
      setSelectedFile(null);
      
      // For close action, also refresh file system to ensure file list is up to date
      if (action === 'close') {
        console.log('File closed, refreshing file system');
        refreshFileSystem().catch(error => {
          console.error('Error refreshing after file close:', error);
        });
      }
    };
    
    // Handle file refresh needed events
    const handleFileRefreshNeeded = (event: Event) => {
      console.log('File refresh needed event received');
      const customEvent = event as CustomEvent;
      const { path, action, content } = customEvent.detail || {};
      
      if (path && action === 'save' && content !== undefined) {
        console.log(`Updating content for file: ${path}`);
        // Update the content of the specific file in the file system
        setFileSystem(prevState => {
          // Helper function to update the file content in the tree
          const updateFileContent = (items: FileSystem[]): FileSystem[] => {
            return items.map(item => {
              // If this is the file we need to update
              if (item.path === path && item.type === 'file') {
                return {
                  ...item,
                  content: content
                };
              }
              
              // If it's a directory, check its children
              if (item.children && item.children.length > 0) {
                return {
                  ...item,
                  children: updateFileContent(item.children)
                };
              }
              
              // Otherwise return the item unchanged
              return item;
            });
          };
          
          return updateFileContent([...prevState]);
        });
      }
    };
    
    // Add event listeners
    window.addEventListener('filesystem-changed', handleExternalRefresh);
    window.addEventListener('reset-file-selection', handleResetFileSelection);
    window.addEventListener('file-refresh-needed', handleFileRefreshNeeded);
    
    // Cleanup when component unmounts
    return () => {
      window.removeEventListener('filesystem-changed', handleExternalRefresh);
      window.removeEventListener('reset-file-selection', handleResetFileSelection);
      window.removeEventListener('file-refresh-needed', handleFileRefreshNeeded);
    };
  }, [selectedFile, refreshFileSystem]);

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