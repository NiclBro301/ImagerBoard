import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { searchService } from '../services/searchService';
import { formatTextWithLineBreaks } from '../utils/textUtils';
import Fuse from 'fuse.js';  // ← Импортируем Fuse.js
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
  const [searchStats, setSearchStats] = useState({ found: 0, total: 0 });

  // 🔴 Настройки Fuse.js для дополнительного ранжирования на клиенте
  const fuseOptions = {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'content', weight: 0.2 },
      { name: 'author', weight: 0.1 },
    ],
    threshold: 0.4,        // 0 = точное, 1 = любое (0.4 = баланс)
    distance: 100,         // Макс. расстояние для матчинга
    minMatchCharLength: 2, // Мин. длина для матчинга
    includeScore: true,    // Возвращать оценку релевантности
    ignoreLocation: true,  // Игнорировать позицию совпадения
  };

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
      
      // 🔴 ДОПОЛНИТЕЛЬНОЕ РАНЖИРОВАНИЕ ЧЕРЕЗ FUSE.JS
      if (response.data.isFuzzy && response.data.results) {
        const allThreads = response.data.results.flatMap(group => group.threads);
        
        if (allThreads.length > 0) {
          const fuse = new Fuse(allThreads, fuseOptions);
          const fuseResults = fuse.search(searchQuery);
          
          // Пересобираем результаты в том же формате, но отсортированные по релевантности
          const rankedThreads = fuseResults.map(r => r.item);
          
          // Группируем заново
          const groupedByBoard = rankedThreads.reduce((acc, thread) => {
            const boardCode = thread.board?.code || 'unknown';
            if (!acc[boardCode]) {
              acc[boardCode] = {
                board: thread.board,
                threads: [],
              };
            }
            acc[boardCode].threads.push(thread);
            return acc;
          }, {});
          
          response.data.results = Object.values(groupedByBoard);
        }
      }
      
      setResults(response.data.results || []);
      setTotalPages(response.data.pages || 1);
      setPage(response.data.page || 1);
      setSearchStats({
        found: response.data.count || 0,
        total: response.data.total || 0,
      });
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

  // 🔴 Подсветка совпадений в результатах
  const highlightMatch = (text, searchTerm) => {
    if (!text || !searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>🔍 Результаты поиска</h1>
        {query && <span className="search-query">по запросу: "{query}"</span>}
      </div>

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
            <p>Попробуйте:</p>
            <ul className="search-tips">
              <li>Использовать другие ключевые слова</li>
              <li>Проверить опечатки (поиск нечёткий, но не всесильный)</li>
              <li>Расширить запрос (например, "питон" вместо "python программирование")</li>
            </ul>
            <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="search-summary">
              Найдено: <strong>{searchStats.found}</strong> из {searchStats.total} тредов
              {query && <span> • Запрос: "{query}"</span>}
              <span className="fuzzy-badge" title="Нечёткий поиск">🎯 Fuzzy</span>
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
                        <h4 
                          className="thread-title"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatch(thread.title, query) 
                          }} 
                        />
                        {thread._score && (
                          <span className="relevance-score" title="Релевантность">
                            {Math.round(thread._score)}%
                          </span>
                        )}
                      </div>
                      
                      <div 
                        className="thread-preview"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightMatch(
                            formatTextWithLineBreaks(thread.content).substring(0, 200) + 
                            (thread.content?.length > 200 ? '...' : ''),
                            query
                          ) 
                        }} 
                      />
                      
                      <div className="thread-meta">
                        <span className="thread-author">
                          👤 <span dangerouslySetInnerHTML={{ __html: highlightMatch(thread.author, query) }} />
                        </span>
                        <span className="thread-stats">💬 {thread.postCount} ответов</span>
                        <span className="thread-date">
                          {new Date(thread.lastPostAt || thread.createdAt).toLocaleString('ru-RU')}
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