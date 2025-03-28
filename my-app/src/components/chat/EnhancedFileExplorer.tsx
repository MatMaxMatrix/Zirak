import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderOpen, FolderClosed, File as FileIcon, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, RefreshCw, Trash2, Copy, Scissors, Settings2,
  MoreHorizontal, Edit, ArrowDownToLine, Eye, EyeOff, X, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { FileSystem } from '@/types/chat';
import * as monaco from 'monaco-editor';

interface EnhancedFileExplorerProps {
  fileSystem: FileSystem[];
  selectedFile: FileSystem | null;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (file: FileSystem) => Promise<void>;
  onRefresh: () => Promise<void>;
  workingDirectory?: string;
  onDeleteFile?: (file: FileSystem) => void;
  onMoveFile?: (sourceFile: FileSystem, destinationDir: FileSystem) => void;
  onCompareFile?: (file: FileSystem, event?: React.MouseEvent) => void;
  onRenameFile?: (file: FileSystem, newName: string) => Promise<void>;
  onCreateFile?: (path: string, name: string, isDirectory: boolean) => Promise<void>;
  onCopy?: (file: FileSystem) => void;
  onPaste?: (targetDir: FileSystem) => void;
  width?: number;
  onOpenSearch?: () => void;
}

export function EnhancedFileExplorer({
  fileSystem,
  selectedFile,
  onToggleDirectory,
  onSelectFile,
  onRefresh,
  workingDirectory,
  onDeleteFile,
  onMoveFile,
  onCompareFile,
  onRenameFile,
  onCreateFile,
  onCopy,
  onPaste,
  width,
  onOpenSearch
}: EnhancedFileExplorerProps) {
  // State management
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<FileSystem | null>(null);
  const [dropTarget, setDropTarget] = useState<FileSystem | null>(null);
  const [contextMenuFile, setContextMenuFile] = useState<FileSystem | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState<{
    type: 'file' | 'directory';
    path: string;
    name: string;
  } | null>(null);
  const [filter, setFilter] = useState('');
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [copiedFile, setCopiedFile] = useState<FileSystem | null>(null);
  const [cutFile, setCutFile] = useState<FileSystem | null>(null);
  
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize expanded state from fileSystem
  useEffect(() => {
    if (fileSystem) {
      const expandedState: Record<string, boolean> = {};
      const processItems = (items: FileSystem[]) => {
        items.forEach(item => {
          if (item.type === 'directory' && item.expanded) {
            expandedState[item.path] = true;
          }
          if (item.children) {
            processItems(item.children);
          }
        });
      };
      
      processItems(fileSystem);
      setExpandedItems(prev => ({...prev, ...expandedState}));
    }
  }, [fileSystem]);

  // Listen for file selection reset events 
  useEffect(() => {
    const handleResetFileSelection = (event: Event) => {
      // When a file is saved or closed, this will help us reset the selection state
      console.log('File explorer handling selection reset');
      
      // Check what type of reset action this is
      const customEvent = event as CustomEvent;
      const { action, path } = customEvent.detail || {};
      
      if (action === 'close') {
        // For file close events, refresh the UI to ensure proper state
        if (onRefresh) {
          onRefresh().catch(error => {
            console.error('Error refreshing after file close:', error);
          });
        }
      }
    };
    
    window.addEventListener('reset-file-selection', handleResetFileSelection);
    
    return () => {
      window.removeEventListener('reset-file-selection', handleResetFileSelection);
    };
  }, [onRefresh]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current && 
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenuPosition(null);
        setContextMenuFile(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input when renaming
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      
      // Select filename without extension for easy editing
      const filename = renameInputRef.current.value;
      const lastDotIndex = filename.lastIndexOf('.');
      
      if (lastDotIndex > 0) {
        // Select only the name part, not the extension
        renameInputRef.current.setSelectionRange(0, lastDotIndex);
      } else {
        // If no extension, select the whole name
        renameInputRef.current.select();
      }
    }
  }, [isRenaming]);

  // Focus create input when creating
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  // Handle item selection
  const handleItemClick = (item: FileSystem, e: React.MouseEvent) => {
    // If command/ctrl key is pressed, allow multiple selection in the future
    const isModifierPressed = e.metaKey || e.ctrlKey;
    
    if (item.type === 'directory') {
      onToggleDirectory(item.path);
      setExpandedItems(prev => ({
        ...prev,
        [item.path]: !prev[item.path]
      }));
    } else {
      onSelectFile(item);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, item: FileSystem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuFile(item);
  };

  // Handle starting rename operation
  const handleRenameStart = (file: FileSystem) => {
    setIsRenaming(file.path);
    setNewName(file.name);
    setContextMenuPosition(null);
  };

  // Handle rename submission
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isRenaming || !newName.trim() || !contextMenuFile) return;
    
    if (onRenameFile) {
      try {
        await onRenameFile(contextMenuFile, newName.trim());
        // Refresh file system after renaming
        onRefresh();
      } catch (error) {
        console.error('Error renaming file:', error);
      }
    }
    
    setIsRenaming(null);
    setNewName('');
  };

  // Handle file/folder creation
  const handleCreate = (type: 'file' | 'directory', path: string = '') => {
    // Default to current directory if none provided
    const targetPath = path || (selectedFile?.type === 'directory' ? selectedFile.path : 
      workingDirectory || '/');
    
    setIsCreating({
      type,
      path: targetPath,
      name: type === 'file' ? 'new-file.js' : 'new-folder'
    });
    
    setNewName(type === 'file' ? 'new-file.js' : 'new-folder');
  };

  // Handle file/folder creation submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isCreating || !newName.trim()) return;
    
    if (onCreateFile) {
      try {
        await onCreateFile(
          isCreating.path, 
          newName.trim(), 
          isCreating.type === 'directory'
        );
        
        // Refresh file system after creation
        onRefresh();
      } catch (error) {
        console.error('Error creating item:', error);
      }
    }
    
    setIsCreating(null);
    setNewName('');
  };

  // Handle drag and drop operations
  const handleDragStart = (e: React.DragEvent, item: FileSystem) => {
    e.dataTransfer.setData('text/plain', item.path);
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, item: FileSystem) => {
    e.preventDefault();
    if (item.type === 'directory' && draggedItem && draggedItem.path !== item.path) {
      setDropTarget(item);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetDir: FileSystem) => {
    e.preventDefault();
    
    if (!draggedItem || !onMoveFile || targetDir.type !== 'directory') return;
    
    // Don't allow dropping into itself or its children
    if (targetDir.path === draggedItem.path || 
        targetDir.path.startsWith(`${draggedItem.path}/`)) {
      return;
    }
    
    onMoveFile(draggedItem, targetDir);
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Filter files based on search input
  const filterFiles = (items: FileSystem[]): FileSystem[] => {
    if (!filter) return items;
    
    return items.filter(item => {
      // If item name contains filter text, include it
      const matchesFilter = item.name.toLowerCase().includes(filter.toLowerCase());
      
      // For directories, also check children recursively
      let hasMatchingChildren = false;
      if (item.type === 'directory' && item.children) {
        const filteredChildren = filterFiles(item.children);
        hasMatchingChildren = filteredChildren.length > 0;
        
        // Update the item with filtered children if needed
        if (hasMatchingChildren) {
          item = {...item, children: filteredChildren};
        }
      }
      
      return matchesFilter || hasMatchingChildren;
    });
  };

  // Handle copying a file
  const handleCopy = (file: FileSystem) => {
    setCopiedFile(file);
    setCutFile(null);
    setContextMenuPosition(null);
    
    if (onCopy) {
      onCopy(file);
    }
  };

  // Handle cutting a file
  const handleCut = (file: FileSystem) => {
    setCutFile(file);
    setCopiedFile(null);
    setContextMenuPosition(null);
  };

  // Handle pasting a file
  const handlePaste = (targetDir: FileSystem) => {
    if (!targetDir || targetDir.type !== 'directory' || (!copiedFile && !cutFile)) return;
    
    if (onPaste) {
      onPaste(targetDir);
      
      // If we were cutting, clear the cut state after paste
      if (cutFile) {
        setCutFile(null);
      }
    }
    
    setContextMenuPosition(null);
  };

  // Toggle visibility of an item
  const toggleItemVisibility = (path: string) => {
    setHiddenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
    setContextMenuPosition(null);
  };

  // Render a single file/folder item
  const renderItem = (item: FileSystem, level: number = 0) => {
    const isDirectory = item.type === 'directory';
    const isSelected = selectedFile?.path === item.path;
    const isExpanded = expandedItems[item.path] || false;
    const isPaste = isDirectory && (copiedFile !== null || cutFile !== null);
    const isHidden = hiddenItems.has(item.path);
    const paddingLeft = `${level * 16}px`;
    const isDropTarget = dropTarget && dropTarget.path === item.path;
    
    // Skip hidden items
    if (isHidden) return null;
    
    return (
      <div key={item.path}>
        <div
          className={`
            group flex items-center py-1 px-2 hover:bg-[#1D1D1D] cursor-pointer 
            ${isSelected ? 'bg-[#1D1D1D]' : ''}
            ${isDropTarget ? 'bg-blue-900/30 border border-blue-500' : ''}
            ${cutFile && cutFile.path === item.path ? 'opacity-50' : ''}
          `}
          style={{ paddingLeft }}
          onClick={(e) => handleItemClick(item, e)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item)}
        >
          {/* Folder/File Icon */}
          {isDirectory ? (
            <>
              <span className="mr-1 w-4 flex items-center">
                {isExpanded ? 
                  <ChevronDown size={14} className="text-gray-400" /> : 
                  <ChevronRight size={14} className="text-gray-400" />
                }
              </span>
              <span className="mr-1 text-yellow-400">
                {isExpanded ? <FolderOpen size={14} /> : <FolderClosed size={14} />}
              </span>
            </>
          ) : (
            <>
              <span className="mr-1 w-4"></span>
              <span className="mr-1 text-blue-400">
                <FileIcon size={14} />
              </span>
            </>
          )}
          
          {/* File/Folder Name with rename input */}
          {isRenaming === item.path ? (
            <form onSubmit={handleRenameSubmit} className="flex-1 min-w-0">
              <input
                ref={renameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#2D2D2D] text-gray-300 text-xs px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onBlur={() => setIsRenaming(null)}
                // Prevent click from bubbling to parent
                onClick={(e) => e.stopPropagation()}
              />
            </form>
          ) : (
            <span className="truncate text-xs">{item.name}</span>
          )}
          
          {/* Action buttons - only visible on hover */}
          <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100">
            {onCompareFile && !isDirectory && (
              <button
                className="p-1 text-gray-400 hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCompareFile) onCompareFile(item, e);
                }}
                title="Compare with another file"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16L12 12L8 16" />
                  <path d="M12 12L12 21" />
                  <path d="M20.39 18.39C22.25 16.5 22.25 13.5 20.39 11.61C18.5 9.75 15.5 9.75 13.61 11.61L12 13" />
                  <path d="M11 10.5L12 12" />
                  <path d="M3.61 11.61C1.75 13.5 1.75 16.5 3.61 18.39C5.5 20.25 8.5 20.25 10.39 18.39L12 16.5" />
                </svg>
              </button>
            )}
            
            {onDeleteFile && (
              <button
                className="p-1 text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeleteFile) onDeleteFile(item);
                }}
                title={`Delete ${isDirectory ? 'directory' : 'file'}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Directory Children */}
        {isDirectory && isExpanded && item.children && item.children.length > 0 && (
          <div>
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
        
        {/* Empty directory indicator */}
        {isDirectory && isExpanded && (!item.children || item.children.length === 0) && (
          <div 
            className="text-xs text-gray-500 italic pl-8 py-1" 
            style={{ paddingLeft: `${(level + 2) * 16}px` }}
          >
            Empty folder
          </div>
        )}
        
        {/* 'New File/Folder' creation input at current level */}
        {isDirectory && isExpanded && isCreating && isCreating.path === item.path && (
          <div 
            className="pl-8 py-1" 
            style={{ paddingLeft: `${(level + 2) * 16}px` }}
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleCreateSubmit} className="flex">
              <input
                ref={createInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 bg-[#2D2D2D] text-gray-300 text-xs px-2 py-1 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
                onBlur={() => setIsCreating(null)}
              />
              <button 
                type="submit"
                className="bg-blue-600 text-white text-xs px-2 py-1 rounded-r"
              >
                Create
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  // Get the project name from the root directory
  const projectName = fileSystem[0]?.name || 'Project';
  
  // Filter files if search is active
  const filteredFiles = filter ? filterFiles(fileSystem) : fileSystem;

  return (
    <div className="h-full flex flex-col bg-[#252526] text-gray-300" style={{ width: width || '100%' }}>
      {/* Header with project name and actions */}
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
          <button
            onClick={() => onRefresh()}
            className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-[#1D1D1D]"
            title="Refresh Explorer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-[#1D1D1D]"
              title="Search Files (Ctrl+P)"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search filter */}
      <div className="px-2 py-1 border-b border-[#1D1D1D]">
        <input
          ref={filterInputRef}
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search files..."
          className="w-full bg-[#3C3C3C] text-gray-300 text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {filter && (
          <button
            className="absolute right-4 top-[38px] text-gray-400 hover:text-gray-200"
            onClick={() => setFilter('')}
          >
            <X size={12} />
          </button>
        )}
      </div>
      
      {/* File/Folder tree */}
      <div className="flex-1 overflow-auto">
        {filteredFiles.length > 0 ? (
          filteredFiles.map(item => renderItem(item))
        ) : (
          <div className="p-2 text-sm text-gray-500">No files found.</div>
        )}
      </div>
      
      {/* Context menu */}
      {contextMenuPosition && contextMenuFile && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-[#1E1E1E] border border-[#3C3C3C] rounded shadow-lg py-1 w-48"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`
          }}
        >
          <div className="px-2 py-1 text-xs text-gray-400 border-b border-[#3C3C3C] truncate">
            {contextMenuFile.name}
          </div>
          
          {/* Common options */}
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
            onClick={() => handleRenameStart(contextMenuFile)}
          >
            <Edit size={12} /> Rename
          </button>
          
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
            onClick={() => {
              if (onDeleteFile) onDeleteFile(contextMenuFile);
              setContextMenuPosition(null);
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
          
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
            onClick={() => handleCopy(contextMenuFile)}
          >
            <Copy size={12} /> Copy
          </button>
          
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
            onClick={() => handleCut(contextMenuFile)}
          >
            <Scissors size={12} /> Cut
          </button>
          
          {/* Directory-specific options */}
          {contextMenuFile.type === 'directory' && (
            <>
              <div className="border-t border-[#3C3C3C] my-1"></div>
              
              <button
                className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
                onClick={() => handleCreate('file', contextMenuFile.path)}
              >
                <FilePlus size={12} /> New File
              </button>
              
              <button
                className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
                onClick={() => handleCreate('directory', contextMenuFile.path)}
              >
                <FolderPlus size={12} /> New Folder
              </button>
              
              {(copiedFile || cutFile) && (
                <button
                  className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
                  onClick={() => handlePaste(contextMenuFile)}
                >
                  <ArrowDownToLine size={12} /> Paste
                </button>
              )}
            </>
          )}
          
          {/* File-specific options */}
          {contextMenuFile.type === 'file' && onCompareFile && (
            <>
              <div className="border-t border-[#3C3C3C] my-1"></div>
              
              <button
                className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
                onClick={(e) => {
                  if (onCompareFile) onCompareFile(contextMenuFile, e);
                  setContextMenuPosition(null);
                }}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 16L12 12L8 16" />
                  <path d="M12 12L12 21" />
                  <path d="M20.39 18.39C22.25 16.5 22.25 13.5 20.39 11.61C18.5 9.75 15.5 9.75 13.61 11.61L12 13" />
                  <path d="M11 10.5L12 12" />
                  <path d="M3.61 11.61C1.75 13.5 1.75 16.5 3.61 18.39C5.5 20.25 8.5 20.25 10.39 18.39L12 16.5" />
                </svg>
                Compare
              </button>
            </>
          )}
          
          {/* Visibility option */}
          <div className="border-t border-[#3C3C3C] my-1"></div>
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-1 text-xs hover:bg-[#2D2D2D]"
            onClick={() => toggleItemVisibility(contextMenuFile.path)}
          >
            {hiddenItems.has(contextMenuFile.path) ? (
              <>
                <Eye size={12} /> Show
              </>
            ) : (
              <>
                <EyeOff size={12} /> Hide
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
} 