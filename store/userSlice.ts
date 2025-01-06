import { PayloadAction, createSlice } from '@reduxjs/toolkit';

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
    setUser(state, action: PayloadAction<UserState>) {
      return {
        id: action.payload.id,
        email: action.payload.email,
        name: action.payload.name,
      };
    },
    clearUser(state) {
      return { ...initialState };
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
