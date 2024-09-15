import { useState } from 'react';
import { useDispatch } from 'react-redux';

import axios, { AxiosError } from 'axios';

import { deleteTransaction } from '@/store/transactionsSlice';

export const useTransactionDelete = (endpoint: string) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const deleteTransactionById = async (transactionId: string) => {
    if (!transactionId) return false;
    const url = `${endpoint}/${transactionId}`;
    try {
      setDeleting(true);
      setError(null);
      console.log(
        `Deleting transaction with ID ${transactionId} from ${url} (status: ${deleting})`,
      );
      const response = await axios.delete(url);
      if (response.status !== 200) {
        throw new Error('Failed to delete transaction');
      }
      dispatch(deleteTransaction(transactionId));
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error deleting transaction from ${url}:`, axiosError);
      setError(`An error occurred: ${axiosError.message}`);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return { deleteTransactionById, deleting, error };
};
