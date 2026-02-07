import { configureStore } from '@reduxjs/toolkit';
import boardsReducer from './boardsSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    boards: boardsReducer,
    auth: authReducer,
  },
});

export default store;