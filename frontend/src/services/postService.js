import api from './api';

export const postService = {
  getAll: (threadId) => api.get(`/threads/${threadId}/posts`),
  create: (threadId, data) => api.post(`/threads/${threadId}/posts`, data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.post(`/posts/${id}/unlike`),
};