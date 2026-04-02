import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getUserStats: () => api.get('/auth/me/stats'),
  
  // 🔴 Методы для уведомлений
  getNotifications: (params = {}) => api.get('/auth/notifications', { params }),
  markNotificationAsRead: (id) => api.patch(`/auth/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/auth/notifications/read-all'),
};

export default authService;