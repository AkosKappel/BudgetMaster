import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

import axios from 'axios';

import { setTransactions } from '@/store/transactionsSlice';
import { Transaction } from '@/types';

const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await axios.get<Transaction[]>('/api/transactions');
  if (response.status !== 200) {
    throw new Error('Failed to fetch transactions');
  }
  return response.data;
};

export const useTransactionsQuery = () => {
  const dispatch = useDispatch();

  return useQuery<Transaction[], Error>('transactions', fetchTransactions, {
    onSuccess: (data: Transaction[]) => {
      console.log('Transactions fetched successfully:', data);
      dispatch(setTransactions(data));
      setTimeout(() => {
        // TODO: Remove this setTimeout
        dispatch(setTransactions([]));
      }, 3000);
    },
    onError: (error: Error) => {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    },
  });
};
