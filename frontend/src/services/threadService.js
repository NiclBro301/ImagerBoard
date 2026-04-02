import api from './api';

export const threadService = {
  // 🔴 api.get автоматически добавляет Authorization заголовок
  getAllByBoardCode: (code) => api.get(`/boards/${code}/threads`),
  
  getById: (id) => api.get(`/boards/thread/${id}`),
  
  // 🔴 POST запрос с FormData
  create: (boardCode, data) => api.post(`/boards/${boardCode}/threads`, data),
  
  update: (id, data) => api.put(`/boards/thread/${id}`, data),
  delete: (id) => api.delete(`/boards/thread/${id}`),
  pin: (id) => api.patch(`/boards/thread/${id}/pin`),
  unpin: (id) => api.patch(`/boards/thread/${id}/unpin`),
};

export default threadService;