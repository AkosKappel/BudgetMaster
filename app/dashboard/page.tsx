'use client';

import React, { useState } from 'react';

import { HomeIcon, PlusIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <HomeIcon className="w-8 h-8 mr-2" />
        Dashboard
      </h1>

      <div className="fixed bottom-5 right-5">
        <button
          className="btn btn-secondary shadow flex items-center space-x-2"
          onClick={openModal}
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Transaction</span>
        </button>
      </div>
      <TransactionForm isOpen={isModalOpen} onClose={closeModal} transaction={null} />
    </div>
  );
};

export default DashboardPage;
