'use client';

import React, { useState } from 'react';

import { PlusIcon } from '@heroicons/react/24/solid';

import ModalTransaction from '@/components/ModalTransaction';

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div className="text-3xl min-h-screen">Dashboard</div>
      <div className="fixed bottom-5 right-5">
        <button
          className="btn btn-secondary shadow flex items-center space-x-2"
          onClick={openModal}
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Transaction</span>
        </button>
      </div>
      <ModalTransaction isOpen={isModalOpen} onClose={closeModal} transaction={null} />
    </>
  );
};

export default DashboardPage;
