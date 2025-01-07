import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { set } from 'mongoose';

type UserState = {
  id?: string;
  email?: string;
  name?: string;
};

const initialState: UserState = {
  id: undefined,
  email: undefined,
  name: undefined,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state: UserState, action: PayloadAction<UserState>) {
      state.id = action.payload.id;
      state.email = action.payload.email;
      state.name = action.payload.name;
    },
    setId(state: UserState, action: PayloadAction<string>) {
      state.id = action.payload;
    },
    setEmail(state: UserState, action: PayloadAction<string>) {
      state.email = action.payload;
    },
    setName(state: UserState, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    clearUser(state: UserState) {
      state.id = initialState.id;
      state.email = initialState.email;
      state.name = initialState.name;
    },
  },
});

export const { setUser, setId, setEmail, setName, clearUser } = userSlice.actions;
export default userSlice.reducer;
