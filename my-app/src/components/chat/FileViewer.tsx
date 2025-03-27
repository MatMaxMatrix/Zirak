import { FileViewerProps } from "@/types/chat";
import { FileText } from "lucide-react";

export function FileViewer({ selectedFile }: FileViewerProps) {
  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-gray-500">
        <FileText className="h-12 w-12 mb-2 text-gray-400" />
        <p>Select a file from the Files tab to view or edit it.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-2 bg-[#1D1D1D] border-b border-[#2D2D2D] flex items-center">
        <FileText className="h-4 w-4 mr-2 text-blue-500" />
        <span className="text-xs font-medium truncate text-gray-200">{selectedFile.path}</span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="p-4 bg-[#0C0C0C] w-full h-full text-sm font-mono overflow-auto border-0 rounded-none text-gray-200">
          {selectedFile.content || 'No content'}
        </pre>
      </div>
    </>
  );
} 