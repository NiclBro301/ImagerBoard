import api from './api';

export const postService = {
  getAll: (threadId) => api.get(`/posts/thread/${threadId}`),
  
  // 🔴 ИСПРАВЛЕНО: не указываем Content-Type вручную!
  create: (threadId, data) => {
    // axios + браузер сами добавят multipart/form-data; boundary
    return api.post(`/posts/thread/${threadId}`, data);
  },
  
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.post(`/posts/${id}/unlike`),
};