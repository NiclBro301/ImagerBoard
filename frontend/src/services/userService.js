import api from './api';

export const userService = {
  getAll: (params = {}) => api.get('/users', { params }),
  
  // 🔹 Новый метод для анонимов
  getAnonymous: (params = {}) => api.get('/users/anonymous', { params }),
  
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  ban: (id, data) => api.post(`/users/${id}/ban`, data),
  unban: (id) => api.post(`/users/${id}/unban`),
  getReports: (id, params = {}) => api.get(`/users/${id}/reports`, { params }),
};

export default userService;