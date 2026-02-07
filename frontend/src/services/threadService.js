import api from './api';

export const threadService = {
  getAll: (boardCode) => api.get(`/boards/${boardCode}/threads`),
  getById: (id) => api.get(`/threads/${id}`),
  create: (boardCode, data) => api.post(`/boards/${boardCode}/threads`, data),
  update: (id, data) => api.put(`/threads/${id}`, data),
  delete: (id) => api.delete(`/threads/${id}`),
  pin: (id) => api.patch(`/threads/${id}/pin`),
  unpin: (id) => api.patch(`/threads/${id}/unpin`),
};