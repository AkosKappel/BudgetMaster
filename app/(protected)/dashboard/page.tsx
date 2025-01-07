'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { HomeIcon, PlusIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/layout/Modal';

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

      <div className="fixed bottom-5 right-5 hover:scale-105 transition duration-300">
        <button className="btn btn-secondary shadow flex items-center space-x-2" onClick={openModal}>
          <PlusIcon className="w-5 h-5" />
          <span>New Transaction</span>
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <TransactionForm onSuccess={closeModal} transaction={null} startCollapsed={true} />
      </Modal>
    </div>
  );
};

export default DashboardPage;
