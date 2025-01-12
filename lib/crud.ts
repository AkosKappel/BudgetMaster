import axios from 'axios';

import { Cashflow } from '@/schemas/cashflowSchema';
import type { Transaction } from '@/schemas/transactionSchema';

const API_BASE = '/BudgetMaster/api';

export async function getLoggedInUser(): Promise<{ _id: string; name: string; email: string }> {
  const response = await axios.get(`${API_BASE}/me`);
  if (response.status !== 200) throw new Error('Failed to fetch user');
  return response.data;
}

export async function getTransactions(limit?: number): Promise<Transaction[]> {
  const response = await axios.get(`${API_BASE}/transactions` + (limit ? `?limit=${limit}` : ''));
  if (response.status !== 200) throw new Error('Failed to fetch user transactions');
  return response.data;
}

export async function createTransaction(transaction: Transaction): Promise<Transaction> {
  const response = await axios.post(`${API_BASE}/transactions`, transaction);
  if (response.status !== 201) throw new Error('Failed to create transaction');
  return response.data;
}

export async function updateTransaction(transaction: Transaction): Promise<Transaction> {
  if (!transaction._id) throw new Error('Missing transaction ID');
  const response = await axios.put(`${API_BASE}/transactions/${transaction._id}`, transaction);
  if (response.status !== 200) throw new Error('Failed to update transaction');
  return response.data;
}

export async function deleteTransaction(transaction: Transaction): Promise<Transaction> {
  if (!transaction._id) throw new Error('Missing transaction ID');
  const response = await axios.delete(`${API_BASE}/transactions/${transaction._id}`);
  if (response.status !== 200) throw new Error('Failed to delete transaction');
  return response.data;
}

export async function getCategories(): Promise<string[]> {
  const response = await axios.get(`${API_BASE}/categories`);
  if (response.status !== 200) throw new Error('Failed to fetch user categories');
  return response.data;
}

export const getLabels = async (): Promise<string[]> => {
  const response = await axios.get(`${API_BASE}/labels`);
  if (response.status !== 200) throw new Error('Failed to fetch user labels');
  return response.data;
};

export const getMonthlyTransactions = async (
  month?: number,
  year?: number,
): Promise<{ transactions: Transaction[]; aggregated: Cashflow }> => {
  const response = await axios.get(
    `${API_BASE}/charts/monthly` + (month ? `?month=${month}` : '') + (year ? `&year=${year}` : ''),
  );
  if (response.status !== 200) throw new Error('Failed to fetch user transactions');
  return response.data;
};
