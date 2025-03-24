import { FileExplorerProps } from "@/types/chat";
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";

export function FileExplorer({ fileSystem, selectedFile, toggleDirectory, selectFile }: FileExplorerProps) {
  // Render file system tree
  const renderFileSystemItems = (items: any[], level: number = 0) => {
    return items.map(item => (
      <div key={item.path} className="file-system-item">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
            selectedFile?.path === item.path ? 'bg-gray-100 dark:bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => item.type === 'directory' ? toggleDirectory(item.path) : selectFile(item)}
        >
          {item.type === 'directory' ? (
            <>
              {item.expanded ? (
                <ChevronDown size={16} className="mr-1" />
              ) : (
                <ChevronRight size={16} className="mr-1" />
              )}
              {item.expanded ? (
                <FolderOpen size={16} className="mr-2 text-amber-500" />
              ) : (
                <Folder size={16} className="mr-2 text-amber-500" />
              )}
            </>
          ) : (
            <FileText size={16} className="ml-5 mr-2 text-blue-500" />
          )}
          <span className="text-sm truncate">{item.name}</span>
        </div>
        
        {item.type === 'directory' && item.expanded && item.children && (
          <div className="file-children">
            {renderFileSystemItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-2 bg-muted/30 border-b flex items-center">
        <Folder className="h-4 w-4 mr-2 text-amber-500" />
        <span className="text-xs font-medium">Project Files</span>
      </div>
      <div className="p-2">
        {renderFileSystemItems(fileSystem)}
      </div>
    </div>
  );
} 