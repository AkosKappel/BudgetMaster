import React, { useState } from 'react';

import { PlusIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/layout/Modal';

export default function AddTransactionButton({ className }: { className?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div className={`${className} hover:scale-105 transition duration-300`}>
        <button className="btn btn-secondary shadow flex items-center space-x-2" onClick={openModal}>
          <PlusIcon className="w-5 h-5" />
          <span>New Transaction</span>
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <TransactionForm onSuccess={closeModal} transaction={null} startCollapsed={true} />
      </Modal>
    </>
  );
}
