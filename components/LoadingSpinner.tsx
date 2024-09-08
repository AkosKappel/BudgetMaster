import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="w-16 h-16 border-t-4 border-b-4 border-primary rounded-full animate-spin"></div>
    </div>
  );
};

export default LoadingSpinner;
