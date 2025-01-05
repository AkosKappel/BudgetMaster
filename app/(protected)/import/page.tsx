'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import axios from 'axios';

import ImportForm from '@/components/forms/ImportForm';
import TransactionForm from '@/components/forms/TransactionForm';
import { type ImportData } from '@/schemas/importSchema';
import { type Transaction } from '@/types/data';

const ImportPage: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [newTransactions, setNewTransactions] = useState<Transaction[]>([]);
  const [importMessage, setImportMessage] = useState('Importing...');

  useEffect(() => {
    let messageIndex = 0;
    const messages = [
      'Importing...',
      'This might take a while...',
      'Still working on it...',
      'Almost there...',
      'Just a bit longer...',
      'Working on it...',
      'Processing...',
      'Almost done...',
      'Finalizing...',
    ].sort(() => Math.random() - 0.5);
    let intervalId: NodeJS.Timeout;
    let progressIntervalId: NodeJS.Timeout;

    if (isImporting) {
      intervalId = setInterval(() => {
        setImportMessage(messages[messageIndex]);
        messageIndex = (messageIndex + 1) % messages.length;
      }, 10_000);

      progressIntervalId = setInterval(() => {
        if (Math.random() < 0.25) {
          setImportProgress((prev) => Math.min(prev + Math.random() * 2, 99));
        }
      }, 5_000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (progressIntervalId) clearInterval(progressIntervalId);
    };
  }, [isImporting]);

  const onSubmit = async (data: ImportData) => {
    try {
      setIsImporting(true);
      setImportProgress(0);

      const dataToProcess: string[] = [
        ...(data.rawText ? [data.rawText] : []),
        ...(await Promise.all((data.files || []).map((file) => file.text()))),
      ];

      for (let i = 0; i < dataToProcess.length; i++) {
        const response = await axios.post('/api/transactions/llm', { content: dataToProcess[i] });
        if (response.status !== 200) {
          throw new Error('Failed to process data');
        }
        const newTransactions = response.data;
        setNewTransactions((prevTransactions) => [...prevTransactions, ...newTransactions]);
        setImportProgress(((i + 1) / dataToProcess.length) * 100);
      }

      toast.success('Data processed successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to process data');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setNewTransactions((prevTransactions) => prevTransactions.filter((t) => t !== transaction));
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <ArrowDownTrayIcon className="w-8 h-8 mr-2" />
        Import Transactions
      </h1>
      <ImportForm loading={isImporting} onSubmit={onSubmit} />

      {isImporting && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center flex items-center justify-center">
            <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
            {importMessage} {Math.round(importProgress)}%
          </p>
        </div>
      )}

      {newTransactions.length > 0 && (
        <>
          <h2 className="text-2xl my-4">New Transactions</h2>
          <div className="space-y-4 mt-8">
            {newTransactions.map((transaction, index) => (
              <div key={transaction._id} className="bg-white shadow rounded-lg p-4">
                <TransactionForm
                  transaction={transaction}
                  title={`Transaction ${index + 1}`}
                  startCollapsed={false}
                  onDelete={() => handleDeleteTransaction(transaction)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImportPage;
