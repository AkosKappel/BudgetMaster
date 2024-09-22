'use client';

import React, { useState } from 'react';

import { HomeIcon, PlusIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/sections/Modal';
import { ErrorMessage, LoadingSpinner } from '@/components/ui';
import { useTransactionsFetch } from '@/hooks/useTransactionsFetch';

const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { transactions, loading, error, refetch } = useTransactionsFetch('/api/transactions');

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

      {/* TODO: Add dashboard content here */}
      <pre>{JSON.stringify(transactions || [], null, 2)}</pre>

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
        <TransactionForm
          onSubmitCallback={closeModal}
          onDeleteCallback={closeModal}
          transaction={null}
        />
      </Modal>
    </div>
  );
};

export default DashboardPage;
