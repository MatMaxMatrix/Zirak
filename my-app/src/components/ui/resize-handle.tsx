import React from 'react';
import { GripVertical } from 'lucide-react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, className = '' }) => {
  return (
    <div
      className={`cursor-row-resize h-1 hover:bg-blue-500/20 group flex items-center justify-center ${className}`}
      onMouseDown={onMouseDown}
    >
      <div className="h-4 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3 w-3 text-gray-400" />
      </div>
    </div>
  );
}; 