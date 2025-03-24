import { FileEditorProps } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";

export function FileEditor({
  filePath,
  fileContent,
  setFileContent,
  saveFileContent,
  cancelFileEditing,
  editorHeight,
  handleEditorMouseDown,
  fileEditorRef
}: FileEditorProps) {
  const fileName = filePath.split('/').pop() || '';
  
  return (
    <div className="flex-1 flex flex-col bg-[#1E1E1E] overflow-hidden">
      <div className="p-2 bg-[#252526] text-white flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center">
          <Code className="h-4 w-4 mr-2 text-blue-400" />
          <span className="text-xs font-medium truncate">
            Editing: {fileName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={saveFileContent}
            className="h-7 py-0 px-2 text-xs bg-transparent border-gray-600 hover:bg-gray-700 text-white"
          >
            Save
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={cancelFileEditing}
            className="h-7 py-0 px-2 text-xs bg-transparent border-gray-600 hover:bg-gray-700 text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        {/* Editor resize handle */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 -mt-0.5 bg-gray-300 hover:bg-blue-500 cursor-ns-resize flex justify-center items-center z-30 transition-all duration-150 group" 
          onMouseDown={handleEditorMouseDown}
        >
          <div className="w-16 h-4 bg-transparent hover:bg-blue-500/20 absolute rounded-full flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity">
            <div className="w-8 h-[2px] bg-blue-500 rounded-full"></div>
          </div>
        </div>
        <textarea
          ref={fileEditorRef}
          className="w-full h-full p-4 bg-[#1E1E1E] text-gray-200 font-mono text-sm resize-none outline-none focus:ring-0 border-0"
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          spellCheck="false"
          style={{ height: `${editorHeight}px` }}
        />
      </div>
    </div>
  );
} 