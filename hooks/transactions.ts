import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import {
  createTransaction,
  deleteTransaction,
  getCategories,
  getLabels,
  getTransactions,
  updateTransaction,
} from '@/lib/crud';
import type { Transaction } from '@/schemas/transactionSchema';
import type { RootState } from '@/store';
import {
  clearCategories,
  clearLabels,
  clearTransactions,
  setCategories,
  setLabels,
  setTransactions,
} from '@/store/transactionsSlice';

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
      if (!force && transactions.length) {
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
    [dispatch, isLoading, transactions],
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
    [dispatch, isLoading, transactions, successCallback, errorCallback],
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
    [dispatch, isLoading, transactions, successCallback, errorCallback],
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
        await deleteTransaction(transaction);
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
    [dispatch, isLoading, transactions, successCallback, errorCallback],
  );

  return {
    remove,
    isLoading,
    isError,
    error,
  };
};

export const useCategories = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<string[]>([]);

  const categories = useSelector((state: RootState) => state.transactions.existingCategories);
  const dispatch = useDispatch();

  const refetch = useCallback(
    async (force: boolean = false) => {
      if (isLoading) return;
      if (!force && categories.length) {
        setData(categories);
        return;
      }

      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const existingCategories = await getCategories();
        setData(existingCategories);
        dispatch(setCategories(existingCategories));
      } catch (error) {
        setIsError(true);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, categories],
  );

  useEffect(() => {
    refetch(true);
  }, []);

  return {
    categories,
    isLoading,
    isError,
    error,
    data,
    refetch,
  };
};

export const useLabels = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<string[]>([]);

  const labels = useSelector((state: RootState) => state.transactions.existingLabels);
  const dispatch = useDispatch();

  const refetch = useCallback(
    async (force: boolean = false) => {
      if (isLoading) return;
      if (!force && labels.length) {
        setData(labels);
        return;
      }

      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const existingLabels = await getLabels();
        setData(existingLabels);
        dispatch(setLabels(existingLabels));
      } catch (error) {
        setIsError(true);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, labels],
  );

  useEffect(() => {
    refetch(true);
  }, []);

  return {
    labels,
    isLoading,
    isError,
    error,
    data,
    refetch,
  };
};
