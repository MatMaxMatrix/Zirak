"use client"

import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  delay?: number;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ 
  children, 
  content, 
  delay = 300, 
  position = 'top' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    const newTimer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimer(newTimer);
  };

  const hideTooltip = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionClass = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 mb-1',
    right: 'left-full top-1/2 transform -translate-y-1/2 translate-x-1 ml-1',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 translate-y-1 mt-1',
    left: 'right-full top-1/2 transform -translate-y-1/2 -translate-x-1 mr-1'
  }[position];

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={showTooltip} 
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-sm max-w-xs ${positionClass}`}
          role="tooltip"
        >
          {content}
          <div className={`
            absolute w-2 h-2 bg-gray-900 transform rotate-45
            ${position === 'top' ? 'top-full -translate-y-1/2 left-1/2 -translate-x-1/2' : ''}
            ${position === 'right' ? 'right-full translate-x-1/2 top-1/2 -translate-y-1/2' : ''}
            ${position === 'bottom' ? 'bottom-full translate-y-1/2 left-1/2 -translate-x-1/2' : ''}
            ${position === 'left' ? 'left-full -translate-x-1/2 top-1/2 -translate-y-1/2' : ''}
          `}></div>
        </div>
      )}
    </div>
  );
}
