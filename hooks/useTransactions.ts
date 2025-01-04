import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import axios, { AxiosError } from 'axios';

import { type TransactionData } from '@/schemas/transactionSchema';
import { RootState } from '@/store';
import {
  addTransaction as addTransactionToStore,
  deleteTransaction as deleteTransactionFromStore,
  setTransactions,
  updateTransaction as updateTransactionInStore,
} from '@/store/transactionsSlice';
import { type Transaction } from '@/types/data';

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await axios.get<Transaction[]>('/api/transactions');
  if (response.status !== 200) {
    throw new Error('Failed to fetch transactions');
  }
  return response.data;
};

export const addTransaction = async (data: TransactionData) => {
  const response = await axios.post('/api/transactions', data);
  if (response.status !== 201) {
    throw new Error('Failed to add transaction');
  }
  return response.data;
};

export const updateTransaction = async (transactionId: string, data: TransactionData) => {
  const response = await axios.put(`/api/transactions/${transactionId}`, data);
  if (response.status !== 200) {
    throw new Error('Failed to update transaction');
  }
  return response.data;
};

export const deleteTransaction = async (transactionId: string) => {
  const response = await axios.delete(`/api/transactions/${transactionId}`);
  if (response.status !== 200) {
    throw new Error('Failed to delete transaction');
  }
  return response.data;
};

export const useFetchTransactions = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const fetchTransactions = useCallback(
    async (force: boolean = false) => {
      if (loading || (transactions.length > 0 && !force)) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getTransactions();
        dispatch(setTransactions(data));
        toast.success('Transactions fetched successfully');
        return data;
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error(`Error fetching transactions:`, axiosError);
        setError(`An error occurred: ${axiosError.message}`);
        toast.error('Failed to fetch transactions');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [dispatch, loading, transactions.length],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refetch = useCallback(() => fetchTransactions(true), [fetchTransactions]);

  return { transactions, loading, error, refetch };
};

export const useTransactionSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const submitTransaction = async (data: TransactionData, transaction: TransactionData | null) => {
    if (loading) return false;
    try {
      setLoading(true);
      setError(null);
      if (transaction?._id) {
        const updatedTransaction = await updateTransaction(transaction._id, data);
        dispatch(updateTransactionInStore(updatedTransaction));
        toast.success('Transaction updated successfully');
      } else {
        const newTransaction = await addTransaction(data);
        dispatch(addTransactionToStore(newTransaction));
        toast.success(`Transaction saved successfully`);
      }
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error submitting transaction:`, axiosError);
      setError(`An error occurred: ${axiosError.message}`);
      toast.error(`Failed to ${transaction ? 'update' : 'save'} transaction`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitTransaction, loading, error };
};

export const useRemoveTransaction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const removeTransaction = async (transactionId: string) => {
    if (!transactionId) return false;
    try {
      setLoading(true);
      setError(null);
      await deleteTransaction(transactionId);
      dispatch(deleteTransactionFromStore(transactionId));
      toast.success('Transaction deleted successfully');
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error deleting transaction:`, axiosError);
      setError(`An error occurred: ${axiosError.message}`);
      toast.error('Failed to delete transaction');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { removeTransaction, loading, error };
};
