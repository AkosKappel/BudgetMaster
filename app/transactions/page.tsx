'use client';

import React, { useEffect, useState } from 'react';

import AddTransaction from '@/components/AddTransaction';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        console.log('Fetching transactions...');
        const response = await fetch('/api/transactions');
        const { transactions } = await response.json();
        console.log(transactions);
        setTransactions(transactions);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <>
      <div className="text-3xl">Transactions</div>
      {loading && <div>Loading...</div>}
      {!loading && transactions.length === 0 && <div>No transactions found</div>}
      {!loading && transactions.length > 0 && (
        <div>
          {transactions.map((transaction) => (
            <div key={transaction._id}>
              <pre className="text-sm">{JSON.stringify(transaction)}</pre>
            </div>
          ))}
        </div>
      )}
      <AddTransaction />
    </>
  );
};

export default TransactionsPage;
