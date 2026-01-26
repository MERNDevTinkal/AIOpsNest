import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const register = createAsyncThunk('auth/register', async (payload: { email: string; password: string }) => {
  const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/auth/register`, payload);
  return res.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null as any, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(register.fulfilled, (state, action) => {
      state.user = action.payload;
      state.status = 'succeeded';
    });
  },
});

export default authSlice.reducer;
