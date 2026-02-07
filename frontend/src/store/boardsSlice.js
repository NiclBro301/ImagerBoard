import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Async thunk для получения бордов
export const fetchBoards = createAsyncThunk(
  'boards/fetchBoards',
  async () => {
    const response = await axios.get(`${API_URL}/boards`);
    return response.data;
  }
);

// Async thunk для создания борда
export const createBoard = createAsyncThunk(
  'boards/createBoard',
  async (boardData) => {
    const response = await axios.post(`${API_URL}/boards`, boardData);
    return response.data;
  }
);

const boardsSlice = createSlice({
  name: 'boards',
  initialState: {
    boards: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.boards.push(action.payload);
      });
  },
});

export default boardsSlice.reducer;