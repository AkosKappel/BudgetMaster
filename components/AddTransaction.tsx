'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { PlusIcon } from '@heroicons/react/24/solid';

const AddTransaction: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div className="fixed bottom-5 right-5">
        <button className="btn btn-secondary shadow flex items-center space-x-2" onClick={openModal}>
          <PlusIcon className="w-5 h-5" />
          <span>Add Transaction</span>
        </button>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Add Transaction">
        <form>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Transaction Name</label>
            <input type="text" className="input input-bordered w-full" placeholder="Enter transaction name" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input type="number" className="input input-bordered w-full" placeholder="Enter amount" />
          </div>
          <button type="button" className="btn btn-primary mt-4" onClick={closeModal}>
            Create
          </button>
        </form>
      </Modal>
    </>
  );
};

export default AddTransaction;
