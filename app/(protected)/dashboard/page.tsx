'use client';

import { useEffect, useState } from 'react';

import { HomeIcon } from '@heroicons/react/24/solid';

import AddTransactionButton from '@/components/ui/AddTransactionButton';
import { getTransactions } from '@/lib/crud';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Transaction } from '@/schemas/transactionSchema';

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      const transactions = await getTransactions(5);
      setRecentTransactions(transactions);
    };
    fetchRecentTransactions();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <HomeIcon className="w-8 h-8 mr-2 text-primary" />
        Dashboard
      </h1>

      {recentTransactions.length > 0 && (
        <>
          <h2 className="text-2xl mb-4">Recent Transactions</h2>
          <div className="grid grid-cols-5 gap-4">
            {recentTransactions.map((transaction: Transaction) => (
              <div key={transaction._id} className="bg-gray-100 p-4 rounded-lg shadow-md text-center">
                <p className="text-lg font-semibold truncate">{transaction.title}</p>
                <p className={`text-lg font-bold ${transaction.isExpense ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPrice(transaction.amount)}
                </p>
                <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <AddTransactionButton className="fixed bottom-5 right-5" />
    </div>
  );
}
