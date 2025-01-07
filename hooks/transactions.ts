import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from '@/lib/crud';
import type { Transaction } from '@/schemas/transactionSchema';
import type { RootState } from '@/store';
import { clearTransactions, setTransactions } from '@/store/transactionsSlice';

export const useTransactions = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Transaction[]>([]);

  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const refetch = useCallback(
    async (force: boolean = false) => {
      if (isLoading) return;
      if (!force && transactions.length > 0) {
        setData(transactions);
        return;
      }

      dispatch(clearTransactions());

      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const fetchedTransactions = await getTransactions();
        setData(fetchedTransactions);

        dispatch(setTransactions(fetchedTransactions));
        toast.success('Loaded transactions');
      } catch (error) {
        setIsError(true);
        setError(error as Error);
        toast.error('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, transactions],
  );

  useEffect(() => {
    refetch(true);
  }, []);

  return {
    transactions,
    isLoading,
    isError,
    error,
    data,
    refetch,
  };
};

export const useCreateTransaction = (successCallback?: () => void, errorCallback?: () => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const create = useCallback(
    async (transaction: Transaction) => {
      if (isLoading) return;
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const createdTransaction = await createTransaction(transaction);
        dispatch(setTransactions([...transactions, createdTransaction]));
        toast.success('Transaction saved');
        successCallback?.();
      } catch (error) {
        setIsError(true);
        setError(error as Error);
        toast.error('Failed to save transaction');
        errorCallback?.();
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, transactions],
  );

  return {
    create,
    isLoading,
    isError,
    error,
  };
};

export const useUpdateTransaction = (successCallback?: () => void, errorCallback?: () => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const update = useCallback(
    async (transaction: Transaction) => {
      if (isLoading) return;
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const updatedTransaction = await updateTransaction(transaction);
        dispatch(setTransactions(transactions.map((t) => (t._id === transaction._id ? updatedTransaction : t))));
        toast.success('Transaction updated');
        successCallback?.();
      } catch (error) {
        setIsError(true);
        setError(error as Error);
        toast.error('Failed to update transaction');
        errorCallback?.();
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, transactions],
  );

  return {
    update,
    isLoading,
    isError,
    error,
  };
};

export const useDeleteTransaction = (successCallback?: () => void, errorCallback?: () => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { transactions } = useSelector((state: RootState) => state.transactions);
  const dispatch = useDispatch();

  const remove = useCallback(
    async (transaction: Transaction) => {
      if (isLoading) return;
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        await remove(transaction);
        dispatch(setTransactions(transactions.filter((t) => t._id !== transaction._id)));
        toast.success('Transaction deleted');
        successCallback?.();
      } catch (error) {
        setIsError(true);
        setError(error as Error);
        toast.error('Failed to delete transaction');
        errorCallback?.();
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, transactions],
  );

  return {
    remove,
    isLoading,
    isError,
    error,
  };
};

// export const useCategories = () => {
//   return useQuery<string[]>({
//     queryKey: ['userCategories'],
//     queryFn: () => getCategories(),
//     refetchOnWindowFocus: false,
//   });
// };

// export const useLabels = () => {
//   return useQuery<string[]>({
//     queryKey: ['userLabels'],
//     queryFn: () => getLabels(),
//     refetchOnWindowFocus: false,
//   });
// };
