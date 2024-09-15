import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import axios, { AxiosError } from 'axios';

import { RootState } from '@/store';
import { setTransactions } from '@/store/transactionsSlice';
import { Transaction } from '@/types';

interface FetchOptions {
  forceFetch?: boolean;
  initialLoading?: boolean;
}

export const useTransactionsFetch = (endpoint: string, initialOptions: FetchOptions = {}) => {
  const [loading, setLoading] = useState<boolean>(initialOptions.initialLoading ?? false);
  const [error, setError] = useState<string | null>(null);
  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const fetchTransactions = useCallback(
    async (options: FetchOptions = {}) => {
      const { forceFetch = false } = options;
      if (loading || (!forceFetch && transactions.length > 0)) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<Transaction[]>(endpoint);
        if (response.status !== 200) {
          throw new Error('Failed to fetch transactions');
        }
        dispatch(setTransactions(response.data));
        return true;
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error(`Error fetching transactions from ${endpoint}:`, axiosError);
        setError(`An error occurred: ${axiosError.message}`);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, loading, endpoint, transactions.length],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refetch = useCallback(() => fetchTransactions({ forceFetch: true }), [fetchTransactions]);

  return { transactions, loading, error, refetch };
};
