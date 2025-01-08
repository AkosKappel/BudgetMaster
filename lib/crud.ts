import axios from 'axios';

import type { Transaction } from '@/schemas/transactionSchema';

export async function getLoggedInUser(): Promise<{ _id: string; name: string; email: string }> {
  const response = await axios.get(`/api/me`);
  if (response.status !== 200) throw new Error('Failed to fetch user');
  return response.data;
}

export async function getTransactions(limit?: number): Promise<Transaction[]> {
  const response = await axios.get(`/api/transactions` + (limit ? `?limit=${limit}` : ''));
  if (response.status !== 200) throw new Error('Failed to fetch user transactions');
  return response.data;
}

export async function createTransaction(transaction: Transaction): Promise<Transaction> {
  const response = await axios.post(`/api/transactions`, transaction);
  if (response.status !== 201) throw new Error('Failed to create transaction');
  return response.data;
}

export async function updateTransaction(transaction: Transaction): Promise<Transaction> {
  if (!transaction._id) throw new Error('Missing transaction ID');
  const response = await axios.put(`/api/transactions/${transaction._id}`, transaction);
  if (response.status !== 200) throw new Error('Failed to update transaction');
  return response.data;
}

export async function deleteTransaction(transaction: Transaction): Promise<Transaction> {
  if (!transaction._id) throw new Error('Missing transaction ID');
  const response = await axios.delete(`/api/transactions/${transaction._id}`);
  if (response.status !== 200) throw new Error('Failed to delete transaction');
  return response.data;
}

export async function getCategories(): Promise<string[]> {
  const response = await axios.get(`/api/categories`);
  if (response.status !== 200) throw new Error('Failed to fetch user categories');
  return response.data;
}

export const getLabels = async (): Promise<string[]> => {
  const response = await axios.get(`/api/labels`);
  if (response.status !== 200) throw new Error('Failed to fetch user labels');
  return response.data;
};
