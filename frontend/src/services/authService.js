import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getUserStats: () => api.get('/auth/me/stats'),
  
  // Уведомления
  getNotifications: (params = {}) => api.get('/auth/notifications', { params }),
  markNotificationAsRead: (id) => api.patch(`/auth/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/auth/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/auth/notifications/${id}`),
};

export default authService;