import api from './api';

export const banService = {
  // Проверить бан
  check: (params) => api.get('/bans/check', { params }),
  
  // Создать бан
  create: (data) => api.post('/bans', data),
  
  // Получить все баны
  getAll: (params) => api.get('/bans', { params }),
  
  // Получить бан по ID
  getById: (id) => api.get(`/bans/${id}`),
  
  // Разбанить
  unban: (id) => api.patch(`/bans/${id}/unban`),
  
  // Продлить бан
  extend: (id, data) => api.patch(`/bans/${id}/extend`, data),
};