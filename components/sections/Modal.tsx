import React, { useEffect, useRef } from 'react';

import { XMarkIcon } from '@heroicons/react/24/solid';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && event.target === overlayRef.current) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        ref={modalRef}
        className="bg-base-200 rounded-lg shadow-lg w-full max-w-3xl flex flex-col relative"
      >
        <button className="btn btn-ghost btn-circle absolute top-2 right-2" onClick={onClose}>
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
