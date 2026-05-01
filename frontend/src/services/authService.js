import api from './api';

export const authService = {
  register: (userData) => {
    return api.post('/auth/register', userData);
  },

  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },

  logout: () => {
    return api.post('/auth/logout');
  },

  getMe: () => {
    return api.get('/auth/me');
  },

  getStats: () => {
    return api.get('/auth/me/stats');
  },

  getNotifications: (params = {}) => {
    return api.get('/auth/notifications', { params });
  },

  markNotificationAsRead: (notificationId) => {
    return api.patch(`/auth/notifications/${notificationId}/read`);
  },

  deleteNotification: (notificationId) => {
    return api.delete(`/auth/notifications/${notificationId}`);
  },

  // 🔴 НОВЫЕ: Аватар и уведомления
  uploadAvatar: (formData) => {
    return api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAvatar: () => {
    return api.delete('/auth/avatar');
  },

  deleteAllNotifications: () => {
    return api.delete('/auth/notifications/all');
  },
};

export default authService;