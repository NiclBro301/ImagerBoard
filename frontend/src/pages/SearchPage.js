import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { searchService } from '../services/searchService';
import { formatTextWithLineBreaks } from '../utils/textUtils';
import './SearchPage.css';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.length >= 2) {
      setQuery(q);
      performSearch(q, 1);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery, pageNum) => {
    if (!searchQuery || searchQuery.length < 2) {
      setError('Введите минимум 2 символа для поиска');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await searchService.search(searchQuery, {
        page: pageNum,
        limit: 20,
      });
      
      setResults(response.data.results || []);
      setTotalPages(response.data.pages || 1);
      setPage(response.data.page || 1);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Ошибка при поиске');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      navigate(`/search?q=${encodeURIComponent(query)}&page=${newPage}`);
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>🔍 Результаты поиска</h1>
        {query && <span className="search-query">по запросу: "{query}"</span>}
      </div>

      {/* Результаты */}
      <div className="search-results">
        {loading && <div className="loader"></div>}
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить запрос или использовать другие ключевые слова</p>
            <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="search-summary">
              Найдено тредов: <strong>{results.reduce((sum, group) => sum + group.threads.length, 0)}</strong>
            </div>

            {results.map((group) => (
              <div key={group.board?._id || group.board?.code} className="board-results">
                <div className="board-header">
                  <Link to={`/board/${group.board?.code}`} className="board-link">
                    /{group.board?.code}/ — {group.board?.name}
                  </Link>
                  <span className="thread-count">({group.threads.length} совпадений)</span>
                </div>

                <div className="threads-list">
                  {group.threads.map((thread) => (
                    <Link 
                      key={thread._id} 
                      to={`/thread/${thread._id}`}
                      className="thread-result"
                    >
                      <div className="thread-result-header">
                        {thread.isPinned && <span className="pin-icon" title="Закреплён">📌</span>}
                        <h4 className="thread-title">{thread.title}</h4>
                      </div>
                      
                      <div className="thread-preview">
                        {formatTextWithLineBreaks(thread.content).substring(0, 200)}
                        {thread.content?.length > 200 ? '...' : ''}
                      </div>
                      
                      <div className="thread-meta">
                        <span className="thread-author">👤 {thread.author}</span>
                        <span className="thread-stats">💬 {thread.postCount} ответов</span>
                        <span className="thread-date">
                          {new Date(thread.lastActivity || thread.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  disabled={page === 1} 
                  onClick={() => handlePageChange(page - 1)}
                  className="pagination-btn"
                >
                  ← Назад
                </button>
                <span className="pagination-info">
                  Стр. {page} из {totalPages}
                </span>
                <button 
                  disabled={page === totalPages} 
                  onClick={() => handlePageChange(page + 1)}
                  className="pagination-btn"
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;