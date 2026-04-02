import api from './api';

export const boardService = {
  getAll: () => api.get('/boards'),  // ← Возвращает весь response, не только data
  
  getByCode: (code) => api.get(`/boards/code/${code}`),
  getById: (id) => api.get(`/boards/${id}`),
  create: (data) => api.post('/boards', data),
  update: (id, data) => api.put(`/boards/${id}`, data),
  delete: (id) => api.delete(`/boards/${id}`),
};

export default boardService;