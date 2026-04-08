import api from './api';

export const searchService = {
  /**
   * Поиск тредов по всем бордам
   * @param {string} query - Поисковый запрос
   * @param {Object} params - Дополнительные параметры
   * @param {number} params.page - Номер страницы (по умолчанию 1)
   * @param {number} params.limit - Количество результатов на странице (по умолчанию 20)
   * @param {string} params.board - Код борда для фильтрации (опционально)
   * @returns {Promise} - Результаты поиска, сгруппированные по бордам
   */
  search: (query, params = {}) => {
    return api.get('/search', {
      params: {
        q: query,
        page: params.page || 1,
        limit: params.limit || 20,
        board: params.board || '',
      },
    });
  },
};

export default searchService;