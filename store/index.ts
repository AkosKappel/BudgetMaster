import { configureStore } from '@reduxjs/toolkit';

import transactionsReducer from '@/store/transactionsSlice';
import userReducer from '@/store/userSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    transactions: transactionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
