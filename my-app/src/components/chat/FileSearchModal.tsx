import { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FileSystem } from '@/types/chat';
import { Search, File as FileIcon, FolderOpen } from 'lucide-react';

interface FileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileSystem: FileSystem[];
  onSelectFile: (file: FileSystem) => Promise<void>;
}

export function FileSearchModal({
  isOpen,
  onClose,
  fileSystem,
  onSelectFile
}: FileSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<FileSystem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  
  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Search function that recursively searches through fileSystem
  const performSearch = (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    
    const normalizedTerm = term.toLowerCase();
    const matchingFiles: FileSystem[] = [];
    
    const searchRecursively = (items: FileSystem[], path: string = '') => {
      items.forEach(item => {
        // Check if item name matches search term
        if (item.name.toLowerCase().includes(normalizedTerm)) {
          matchingFiles.push(item);
        }
        
        // If it's a directory, search its children
        if (item.type === 'directory' && item.children) {
          searchRecursively(item.children, `${path}/${item.name}`);
        }
      });
    };
    
    searchRecursively(fileSystem);
    
    // Sort results: exact matches first, then by path length, then alphabetically
    matchingFiles.sort((a, b) => {
      // Exact matches first
      const aExact = a.name.toLowerCase() === normalizedTerm;
      const bExact = b.name.toLowerCase() === normalizedTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then prioritize files over directories
      if (a.type === 'file' && b.type === 'directory') return -1;
      if (a.type === 'directory' && b.type === 'file') return 1;
      
      // Then sort by path length (shorter paths first)
      if (a.path.length !== b.path.length) {
        return a.path.length - b.path.length;
      }
      
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    setResults(matchingFiles);
    setSelectedIndex(0);
  };
  
  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    performSearch(term);
  };
  
  // Handle arrow key navigation
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelectFile(results[selectedIndex]);
      }
    }
  };
  
  // Scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const selectedElement = container.querySelector(`[data-index="${selectedIndex}"]`);
      
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);
  
  // Handle file selection
  const handleSelectFile = async (file: FileSystem) => {
    try {
      await onSelectFile(file);
      onClose();
      setSearchTerm('');
      setResults([]);
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#1E1E1E] rounded-md shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center p-3 border-b border-[#2D2D2D]">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search for files..."
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 outline-none text-sm"
            autoComplete="off"
          />
        </div>
        
        {/* Results */}
        <div 
          ref={resultsContainerRef}
          className="max-h-[350px] overflow-y-auto"
        >
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((file, index) => (
                <div
                  key={file.path}
                  data-index={index}
                  className={`
                    flex items-center px-3 py-2 cursor-pointer text-sm
                    ${selectedIndex === index ? 'bg-blue-600/20 text-blue-200' : 'hover:bg-[#2D2D2D]'}
                  `}
                  onClick={() => handleSelectFile(file)}
                >
                  {file.type === 'directory' ? (
                    <FolderOpen className="h-4 w-4 text-yellow-400 mr-2 flex-shrink-0" />
                  ) : (
                    <FileIcon className="h-4 w-4 text-blue-400 mr-2 flex-shrink-0" />
                  )}
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-xs text-gray-400 truncate">{file.path}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="py-6 text-center text-gray-400 text-sm">
              No results found
            </div>
          ) : (
            <div className="py-6 text-center text-gray-400 text-sm">
              Type to search for files
            </div>
          )}
        </div>
        
        {/* Key commands help */}
        <div className="p-2 text-xs text-gray-500 border-t border-[#2D2D2D] bg-[#252526]">
          <span className="mr-4">↑↓ to navigate</span>
          <span className="mr-4">↵ to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
} 