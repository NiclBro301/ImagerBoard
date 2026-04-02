import { createSlice } from '@reduxjs/toolkit';

// 🔴 Вспомогательная функция для загрузки состояния из localStorage
const loadAuthState = () => {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      return {
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error('❌ Error loading auth state from localStorage:', error);
    // Очищаем битые данные
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
};

const initialState = loadAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 🔴 login → setCredentials (переименовано для ясности)
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      
      // 🔴 Сохраняем и токен, и пользователя в localStorage
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      
      // 🔴 Очищаем localStorage при выходе
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    
    // 🔴 Обновление данных пользователя (например, после смены роли)
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    
    // 🔴 Очистка бана (для обновления UI после разбана)
    clearBan: (state) => {
      if (state.user) {
        state.user.bannedUntil = null;
        state.user.isActive = true;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const { setCredentials, logout, updateUser, clearBan } = authSlice.actions;
export default authSlice.reducer;