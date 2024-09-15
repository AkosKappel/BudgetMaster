import React, { useState } from 'react';

type TooltipProps = {
  content: string;
  children: React.ReactNode;
};

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 w-64 px-4 py-2 text-sm font-light text-white bg-gray-700 rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
