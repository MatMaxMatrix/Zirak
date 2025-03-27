import { FileSystem } from "@/types/chat";
import { FolderOpen, FolderClosed, File, ChevronRight, ChevronDown, Plus, FilePlus, FolderPlus } from "lucide-react";
import { useState } from "react";

interface FileExplorerProps {
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
  toggleDirectory: (path: string) => void;
  selectFile: (file: FileSystem) => Promise<void>;
  refreshFileSystem: () => Promise<void>;
}

export function FileExplorer({ fileSystem, selectedFile, toggleDirectory, selectFile, refreshFileSystem }: FileExplorerProps) {
  const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null);
  const [newName, setNewName] = useState('');
  const [currentPath, setCurrentPath] = useState('');

  const handleCreate = async (type: 'file' | 'directory') => {
    setIsCreating(type);
    setNewName('');
    // Get the current directory path from the selected file or root
    const path = selectedFile?.type === 'directory' ? selectedFile.path : '';
    setCurrentPath(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    console.log('Starting file/directory creation:', {
      type: isCreating,
      name: newName.trim(),
      currentPath
    });

    try {
      const command = isCreating === 'directory' ? 'mkdir -p' : 'touch';
      // Ensure we're in the correct directory first
      const cdCommand = currentPath ? `cd "${currentPath}" && ` : '';
      const fullCommand = `${cdCommand}${command} "${newName.trim()}"`;
      
      console.log('Executing command:', fullCommand);

      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: fullCommand,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      console.log('Command executed successfully, waiting for file system update...');

      // Wait a bit for the file system to update
      setTimeout(async () => {
        try {
          console.log('Attempting to refresh file system...');
          // Refresh the file system to show the new item
          await refreshFileSystem();
          console.log('File system refreshed successfully');
          
          // If we created a directory, expand it
          if (isCreating === 'directory' && currentPath) {
            console.log('Expanding directory:', currentPath);
            toggleDirectory(currentPath);
          }
        } catch (error) {
          console.error('Error refreshing file system:', error);
        } finally {
          console.log('Resetting form state');
          // Reset the form
          setIsCreating(null);
          setNewName('');
          setCurrentPath('');
        }
      }, 1000); // Increased delay to 1 second for more reliable refresh
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const renderItem = (item: FileSystem, level: number = 0) => {
    const isDirectory = item.type === 'directory';
    const isSelected = selectedFile?.path === item.path;
    const isExpanded = item.expanded;
    const paddingLeft = `${level * 16}px`;

    return (
      <div key={item.path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-[#1D1D1D] cursor-pointer ${
            isSelected ? 'bg-[#1D1D1D]' : ''
          }`}
          style={{ paddingLeft }}
          onClick={() => {
            if (isDirectory) {
              toggleDirectory(item.path);
            } else {
              selectFile(item);
            }
          }}
        >
          {isDirectory ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 mr-1" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
              ) : (
                <FolderClosed className="h-4 w-4 text-blue-500 mr-2" />
              )}
            </>
          ) : (
            <File className="h-4 w-4 text-gray-400 mr-2" />
          )}
          <span className="text-sm text-gray-300">{item.name}</span>
        </div>
        {isDirectory && isExpanded && item.children && (
          <div>
            {item.children.map((child: FileSystem) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get the project name from the root directory
  const projectName = fileSystem[0]?.name || 'Project';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-[#1D1D1D]">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-300">{projectName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreate('file')}
            className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-[#1D1D1D]"
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCreate('directory')}
            className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-[#1D1D1D]"
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isCreating && (
          <form onSubmit={handleSubmit} className="p-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`New ${isCreating}...`}
              className="w-full bg-[#1D1D1D] text-gray-300 text-sm px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </form>
        )}
        {fileSystem.map((item) => renderItem(item))}
      </div>
    </div>
  );
} 