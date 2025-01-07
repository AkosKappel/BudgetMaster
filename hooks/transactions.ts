import { toast } from 'react-toastify';

import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type { Transaction } from '@/schemas/transactionSchema';

export const useTransactions = () => {
  return useQuery<Transaction[]>({
    queryKey: ['userTransactions'],
    queryFn: () => getTransactions(),
    // refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateTransaction = (params: {}) => {
  return useMutation({
    mutationFn: createTransaction,
    ...params,
  });
};

export const useUpdateTransaction = (params: {}) => {
  return useMutation({
    mutationFn: updateTransaction,
    ...params,
  });
};

export const useDeleteTransaction = (params: {}) => {
  return useMutation({
    mutationFn: deleteTransaction,
    ...params,
  });
};

export const useCategories = () => {
  return useQuery<string[]>({
    queryKey: ['userCategories'],
    queryFn: () => getCategories(),
    refetchOnWindowFocus: false,
  });
};

export const useLabels = () => {
  return useQuery<string[]>({
    queryKey: ['userLabels'],
    queryFn: () => getLabels(),
    refetchOnWindowFocus: false,
  });
};

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const response = await axios.get(`/api/transactions`);
    if (response.status !== 200) {
      throw new Error('Failed to fetch user transactions');
    }
    toast.success('Fetched user transactions');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return [];
  }
}

export async function createTransaction(transaction: Transaction): Promise<Transaction | null> {
  try {
    const response = await axios.post(`/api/transactions`, transaction);
    if (response.status !== 201) {
      throw new Error('Failed to create transaction');
    }
    toast.success('New transaction saved');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return null;
  }
}

export async function updateTransaction(transaction: Transaction): Promise<Transaction | null> {
  try {
    if (!transaction._id) {
      throw new Error('Missing transaction ID');
    }
    const response = await axios.put(`/api/transactions/${transaction._id}`, transaction);
    if (response.status !== 200) {
      throw new Error('Failed to update transaction');
    }
    toast.success('Transaction updated');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return null;
  }
}

export async function deleteTransaction(transaction: Transaction): Promise<Transaction | null> {
  try {
    if (!transaction._id) {
      throw new Error('Missing transaction ID');
    }
    const response = await axios.delete(`/api/transactions/${transaction._id}`);
    if (response.status !== 200) {
      throw new Error('Failed to delete transaction');
    }
    toast.success('Transaction deleted');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return null;
  }
}

export async function getCategories(): Promise<string[]> {
  try {
    const response = await axios.get(`/api/categories`);
    if (response.status !== 200) {
      throw new Error('Failed to fetch user categories');
    }
    toast.success('Fetched user categories');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return [];
  }
}

export const getLabels = async () => {
  try {
    const response = await axios.get(`/api/labels`);
    if (response.status !== 200) {
      throw new Error('Failed to fetch user labels');
    }
    toast.success('Fetched user labels');
    return response.data;
  } catch (error) {
    console.error(error);
    toast.error((error as Error).message);
    return [];
  }
};
