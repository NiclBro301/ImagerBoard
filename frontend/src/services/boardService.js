import api from './api';

export const boardService = {
  getAll: () => api.get('/boards'),
  getById: (id) => api.get(`/boards/${id}`),
  getByCode: (code) => api.get(`/boards/code/${code}`),
  create: (data) => api.post('/boards', data),
  update: (id, data) => api.put(`/boards/${id}`, data),
  delete: (id) => api.delete(`/boards/${id}`),
};