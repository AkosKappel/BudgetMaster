import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { toTitleCase } from '@/lib/utils';
import { type Transaction } from '@/types/data';

interface TransactionsState {
  transactions: Transaction[]; // transaction items
  uniqueLabels: string[]; // unique labels in alphabetical order and written in title case
}

const initialState: TransactionsState = {
  transactions: [],
  uniqueLabels: [],
};

const updateUniqueLabels = (state: TransactionsState) => {
  state.uniqueLabels = Array.from(new Set(state.transactions.flatMap((t) => t.labels)))
    .map(toTitleCase)
    .sort((a, b) => a.localeCompare(b));
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    // Transactions
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      updateUniqueLabels(state);
    },
    addTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = [...state.transactions, ...action.payload];
      updateUniqueLabels(state);
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.push(action.payload);
      updateUniqueLabels(state);
    },
    updateTransaction: (state, action: PayloadAction<Transaction>) => {
      const index = state.transactions.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
        updateUniqueLabels(state);
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter((t) => t._id !== action.payload);
      updateUniqueLabels(state);
    },

    // Labels
    setLabels: (state, action: PayloadAction<string[]>) => {
      state.uniqueLabels = Array.from(new Set(action.payload))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    addLabels: (state, action: PayloadAction<string[]>) => {
      state.uniqueLabels = Array.from(new Set([...state.uniqueLabels, ...action.payload]))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    addLabel: (state, action: PayloadAction<string>) => {
      state.uniqueLabels.push(toTitleCase(action.payload));
      state.uniqueLabels.sort((a, b) => a.localeCompare(b));
    },
    removeLabel: (state, action: PayloadAction<string>) => {
      const label = toTitleCase(action.payload);
      state.uniqueLabels = state.uniqueLabels.filter((l) => l !== label);
    },
  },
});

export const {
  setTransactions,
  addTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  setLabels,
  addLabels,
  addLabel,
  removeLabel,
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
