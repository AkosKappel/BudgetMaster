import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { toTitleCase } from '@/lib/utils';
import { type Transaction } from '@/schemas/transactionSchema';

interface TransactionsState {
  transactions: Transaction[]; // transaction items
  existingCategories: string[]; // unique categories in alphabetical order and written in title case
  existingLabels: string[]; // same as categories
}

const initialState: TransactionsState = {
  transactions: [],
  existingCategories: [],
  existingLabels: [],
};

const updateUniqueCategories = (state: TransactionsState) => {
  state.existingCategories = Array.from(
    new Set([...state.existingCategories, ...state.transactions.map((t) => t.category)]),
  )
    .map((c) => c.toUpperCase())
    .sort((a, b) => a.localeCompare(b));
};

const updateUniqueLabels = (state: TransactionsState) => {
  state.existingLabels = Array.from(new Set([...state.existingLabels, ...state.transactions.flatMap((t) => t.labels)]))
    .map(toTitleCase)
    .sort((a, b) => a.localeCompare(b));
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    resetState: () => initialState,
    // Transactions
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      updateUniqueCategories(state);
      updateUniqueLabels(state);
    },
    addTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = [...state.transactions, ...action.payload];
      updateUniqueCategories(state);
      updateUniqueLabels(state);
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.push(action.payload);
      updateUniqueCategories(state);
      updateUniqueLabels(state);
    },
    updateTransaction: (state, action: PayloadAction<Transaction>) => {
      const index = state.transactions.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
        updateUniqueCategories(state);
        updateUniqueLabels(state);
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter((t) => t._id !== action.payload);
      updateUniqueCategories(state);
      updateUniqueLabels(state);
    },
    clearTransactions: (state) => {
      state.transactions = initialState.transactions;
    },

    // Categories
    setCategories: (state, action: PayloadAction<string[]>) => {
      state.existingCategories = Array.from(new Set(action.payload))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    addCategories: (state, action: PayloadAction<string[]>) => {
      state.existingCategories = Array.from(new Set([...state.existingCategories, ...action.payload]))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    removeCategories: (state, action: PayloadAction<string[]>) => {
      state.existingCategories = state.existingCategories.filter((c) => !action.payload.includes(c));
    },
    addCategory: (state, action: PayloadAction<string>) => {
      state.existingCategories.push(toTitleCase(action.payload));
      state.existingCategories.sort((a, b) => a.localeCompare(b));
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      const category = toTitleCase(action.payload);
      state.existingCategories = state.existingCategories.filter((c) => c !== category);
    },
    clearCategories: (state) => {
      state.existingCategories = initialState.existingCategories;
    },

    // Labels
    setLabels: (state, action: PayloadAction<string[]>) => {
      state.existingLabels = Array.from(new Set(action.payload))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    addLabels: (state, action: PayloadAction<string[]>) => {
      state.existingLabels = Array.from(new Set([...state.existingLabels, ...action.payload]))
        .map(toTitleCase)
        .sort((a, b) => a.localeCompare(b));
    },
    removeLabels: (state, action: PayloadAction<string[]>) => {
      state.existingLabels = state.existingLabels.filter((l) => !action.payload.includes(l));
    },
    addLabel: (state, action: PayloadAction<string>) => {
      state.existingLabels.push(toTitleCase(action.payload));
      state.existingLabels.sort((a, b) => a.localeCompare(b));
    },
    removeLabel: (state, action: PayloadAction<string>) => {
      const label = toTitleCase(action.payload);
      state.existingLabels = state.existingLabels.filter((l) => l !== label);
    },
    clearLabels: (state) => {
      state.existingLabels = initialState.existingLabels;
    },
  },
});

export const {
  resetState,
  setTransactions,
  addTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  clearTransactions,
  setCategories,
  addCategories,
  removeCategories,
  addCategory,
  removeCategory,
  clearCategories,
  setLabels,
  addLabels,
  removeLabels,
  addLabel,
  removeLabel,
  clearLabels,
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
