import { useState } from 'react';
import { useDispatch } from 'react-redux';

import axios, { AxiosError } from 'axios';

import { type TransactionData } from '@/schemas/transaction';
import { addTransaction, updateTransaction } from '@/store/transactionsSlice';

export const useTransactionSubmit = (endpoint: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const submitTransaction = async (data: TransactionData, transaction: TransactionData | null) => {
    if (loading) return false;
    const url = transaction ? `${endpoint}/${transaction._id}` : endpoint;

    setLoading(true);
    setError(null);

    try {
      if (transaction) {
        const putResponse = await axios.put(url, data);
        if (putResponse.status !== 200) {
          throw new Error('Failed to update transaction');
        }
        dispatch(updateTransaction(putResponse.data));
        return true;
      } else {
        const postResponse = await axios.post(url, data);
        if (postResponse.status !== 201) {
          throw new Error('Failed to add transaction');
        }
        dispatch(addTransaction(postResponse.data));
        return true;
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error submitting transaction to ${url}:`, axiosError);
      setError(`An error occurred: ${axiosError.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitTransaction, loading, error };
};
