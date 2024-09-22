'use client';

import React, { useState } from 'react';

import { HomeIcon, PlusIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/sections/Modal';
import { ErrorMessage, LoadingSpinner } from '@/components/ui';
import { useFetchTransactions } from '@/hooks/useTransactions';

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { transactions, loading, error, refetch } = useFetchTransactions();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <HomeIcon className="w-8 h-8 mr-2" />
        Dashboard
      </h1>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction._id} className="bg-white shadow rounded-lg p-4">
            <TransactionForm transaction={transaction} />
          </div>
        ))}
      </div>

      <div className="fixed bottom-5 right-5">
        <button
          className="btn btn-secondary shadow flex items-center space-x-2"
          onClick={openModal}
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Transaction</span>
        </button>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <TransactionForm onSubmit={closeModal} onDelete={closeModal} transaction={null} />
      </Modal>
    </div>
  );
};

export default DashboardPage;
