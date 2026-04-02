import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { boardService } from '../services/boardService';

// 🔴 Асинхронный экшен для загрузки бордов
export const fetchBoards = createAsyncThunk(
  'boards/fetchBoards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await boardService.getAll();
      // 🔴 Правильно извлекаем массив бордов из ответа
      return response.data?.boards || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Ошибка при загрузке бордов');
    }
  }
);

const initialState = {
  boards: [],  // 🔴 Инициализируем пустым массивом
  status: 'idle',  // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    // Синхронные экшены (если понадобятся)
    clearBoards: (state) => {
      state.boards = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 🔴 Гарантируем, что boards — массив
        state.boards = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Ошибка при загрузке бордов';
        state.boards = [];  // 🔴 Сбрасываем на пустой массив при ошибке
      });
  },
});

export const { clearBoards } = boardsSlice.actions;
export default boardsSlice.reducer;