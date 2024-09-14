import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { Transaction } from '@/types';

interface TransactionsState {
  items: Transaction[];
}

const initialState: TransactionsState = {
  items: [],
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.items = action.payload;
    },
    addTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.items = [...state.items, ...action.payload];
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.items.push(action.payload);
    },
    updateTransaction: (state, action: PayloadAction<Transaction>) => {
      const index = state.items.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t._id !== action.payload);
    },
  },
});

export const {
  setTransactions,
  addTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
