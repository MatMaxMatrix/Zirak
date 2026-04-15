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
          className={`flex items-center py-1 px-2 cursor-pointer rounded-sm transition-colors ${
            isSelected
              ? 'bg-[#2A2A2A] text-white'
              : 'hover:bg-[#222] text-gray-200'
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
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-blue-400 mr-1.5 shrink-0" />
              ) : (
                <FolderClosed className="h-3.5 w-3.5 text-blue-400 mr-1.5 shrink-0" />
              )}
            </>
          ) : (
            <File className="h-3.5 w-3.5 text-gray-400 mr-1.5 ml-4 shrink-0" />
          )}
          <span className="text-sm truncate">{item.name}</span>
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
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs font-semibold text-white truncate">{projectName}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleCreate('file')}
            className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors"
            title="New File"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleCreate('directory')}
            className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {isCreating && (
          <form onSubmit={handleSubmit} className="px-2 py-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`New ${isCreating}…`}
              className="w-full bg-[#2A2B32] border border-[#555] text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
              autoFocus
            />
          </form>
        )}
        {fileSystem.length === 0 && !isCreating && (
          <div className="px-3 py-4 text-xs text-gray-500 text-center select-none">
            Workspace is empty.<br />Files created by the agent will appear here.
          </div>
        )}
        {fileSystem.map((item) => renderItem(item))}
      </div>
    </div>
  );
} 