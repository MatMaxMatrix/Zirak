import { ResizeHandlerProps } from "@/types/chat";

export function ResizeHandle({ 
  onMouseDown, 
  direction,
  className = "" 
}: ResizeHandlerProps) {
  const baseClasses = {
    horizontal: "w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize z-30 transition-all duration-150 group flex items-center justify-center",
    vertical: "absolute top-0 left-0 right-0 h-1 -mt-0.5 bg-gray-300 hover:bg-blue-500 cursor-ns-resize flex justify-center items-center z-30 transition-all duration-150 group"
  };
  
  const handleClasses = {
    horizontal: "h-16 w-4 bg-transparent hover:bg-blue-500/20 absolute rounded-full flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity",
    vertical: "w-16 h-4 bg-transparent hover:bg-blue-500/20 absolute rounded-full flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity"
  };
  
  const indicatorClasses = {
    horizontal: "h-8 w-[2px] bg-blue-500 rounded-full",
    vertical: "w-8 h-[2px] bg-blue-500 rounded-full"
  };
  
  return (
    <div 
      className={`${baseClasses[direction]} ${className}`}
      onMouseDown={onMouseDown}
    >
      <div className={handleClasses[direction]}>
        <div className={indicatorClasses[direction]}></div>
      </div>
    </div>
  );
} 