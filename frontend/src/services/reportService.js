import api from './api';

export const reportService = {
  getAll: (params = {}) => api.get('/reports', { params }),
  
  getById: (id) => api.get(`/reports/${id}`),
  
  create: (data) => api.post('/reports', data),
  
  // 🔴 Обновлено: отправляем action: 'approve' или 'reject'
  processWithBan: (id, data) => {
    return api.patch(`/reports/${id}/process`, {
      action: data.action, // 'approve' или 'reject'
      notes: data.notes,
    });
  },
  
  reject: (id, data) => {
    return api.patch(`/reports/${id}/reject`, {
      notes: data.notes,
    });
  },
  
  delete: (id) => api.delete(`/reports/${id}`),
};

export default reportService;