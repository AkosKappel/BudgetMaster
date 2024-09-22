import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

import { getTransactions } from '@/hooks/useTransactions';
import { setTransactions } from '@/store/transactionsSlice';
import { type Transaction } from '@/types';

export const useTransactionsQuery = () => {
  const dispatch = useDispatch();

  return useQuery<Transaction[], Error>('transactions', getTransactions, {
    onSuccess: (data: Transaction[]) => {
      console.log('Transactions fetched successfully:', data);
      dispatch(setTransactions(data));
    },
    onError: (error: Error) => {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    },
  });
};
