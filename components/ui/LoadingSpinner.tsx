import React from 'react';

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex justify-center items-center my-24 ${className}`}>
      <div className="w-16 h-16 border-t-4 border-b-4 border-primary rounded-full animate-spin"></div>
    </div>
  );
}
