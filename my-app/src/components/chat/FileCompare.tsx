import { useState, useEffect } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Save, X } from "lucide-react";
import path from "path";

interface FileCompareProps {
  file1: {
    path: string;
    name: string;
    content: string;
  };
  file2: {
    path: string;
    name: string;
    content: string;
  };
  onClose: () => void;
}

export function FileCompare({ file1, file2, onClose }: FileCompareProps) {
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Reset loading state when files change
    setIsLoading(true);
  }, [file1.path, file2.path]);
  
  // Determine language based on file extension
  const getLanguage = (filePath: string): string => {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    
    return languageMap[ext] || 'plaintext';
  };
  
  const language1 = getLanguage(file1.path);
  const language2 = getLanguage(file2.path);
  
  // When language differs, we'll use diffEditor's best effort
  const language = language1 === language2 ? language1 : 'plaintext';
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-[#212121] border-b border-[#2A2A2A]">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 mr-2"
            onClick={onClose}
          >
            <ChevronLeft size={16} className="mr-1" />
            Back
          </Button>
          <div className="text-sm font-medium">
            Comparing Files
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-xs text-gray-400 mr-4">
            <span className="font-semibold">{file1.name}</span>
            {" vs "}
            <span className="font-semibold">{file2.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </div>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        <DiffEditor
          height="100%"
          language={language}
          original={file1.content}
          modified={file2.content}
          theme={theme}
          options={{
            readOnly: true,
            renderSideBySide: true,
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            diffCodeLens: true,
            colorDecorators: true,
          }}
          loading={<div className="flex items-center justify-center h-full text-gray-400">Loading comparison...</div>}
          onMount={() => setIsLoading(false)}
        />
      </div>
      
      {/* If needed, a footer for additional controls */}
      <div className="flex items-center justify-between p-2 bg-[#212121] border-t border-[#2A2A2A]">
        <div className="text-xs text-gray-400">
          {isLoading 
            ? "Loading comparison..." 
            : `Showing differences between ${file1.name} and ${file2.name}`
          }
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7"
            onClick={() => setTheme(theme === "vs-dark" ? "light" : "vs-dark")}
          >
            Toggle Theme
          </Button>
        </div>
      </div>
    </div>
  );
} 