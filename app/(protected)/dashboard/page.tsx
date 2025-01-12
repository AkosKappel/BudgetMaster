'use client';

import { useEffect, useState } from 'react';

import { HomeIcon } from '@heroicons/react/24/solid';

import AddTransactionButton from '@/components/ui/AddTransactionButton';
import { getMonthlyTransactions, getTransactions } from '@/lib/crud';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Cashflow } from '@/schemas/cashflowSchema';
import type { Transaction } from '@/schemas/transactionSchema';

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [cashflow, setCashflow] = useState<Cashflow | null>(null);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      const transactions = await getTransactions(5);
      setRecentTransactions(transactions);
    };
    fetchRecentTransactions();
  }, []);

  useEffect(() => {
    const fetchCashflow = async () => {
      const data = await getMonthlyTransactions();
      setCashflow(data.aggregated);
    };
    fetchCashflow();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl mb-4 md:mb-8 flex items-center">
        <HomeIcon className="w-6 h-6 md:w-8 md:h-8 mr-2 text-primary" />
        Dashboard
      </h1>

      {recentTransactions.length > 0 && (
        <>
          <h2 className="text-xl md:text-2xl mb-2 md:mb-4">Recent Transactions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {recentTransactions.map((transaction: Transaction) => (
              <div key={transaction._id} className="bg-gray-100 p-3 md:p-4 rounded-lg shadow-md text-center">
                <p className="text-base md:text-lg font-semibold truncate">{transaction.title}</p>
                <p
                  className={`text-base md:text-lg font-bold ${transaction.isExpense ? 'text-red-500' : 'text-green-500'}`}
                >
                  {formatPrice(transaction.amount)}
                </p>
                <p className="text-xs md:text-sm text-gray-500">{formatDate(transaction.date)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {cashflow && (
        <>
          <h2 className="text-xl md:text-2xl mb-2 md:mb-4 mt-4 md:mt-8">Latest Month Cashflow</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-100 p-3 md:p-4 rounded-lg shadow-md text-center">
              <p className="text-base md:text-lg font-semibold">Income</p>
              <p className="text-base md:text-lg font-bold text-green-500">{formatPrice(cashflow.income)}</p>
            </div>
            <div className="bg-gray-100 p-3 md:p-4 rounded-lg shadow-md text-center">
              <p className="text-base md:text-lg font-semibold">Expenses</p>
              <p className="text-base md:text-lg font-bold text-red-500">{formatPrice(cashflow.expense)}</p>
            </div>
            <div className="bg-gray-100 p-3 md:p-4 rounded-lg shadow-md text-center">
              <p className="text-base md:text-lg font-semibold">Balance</p>
              <p className="text-base md:text-lg font-bold text-purple-500">{formatPrice(cashflow.balance)}</p>
            </div>
          </div>
        </>
      )}

      <AddTransactionButton className="fixed bottom-5 right-5" />
    </div>
  );
}
