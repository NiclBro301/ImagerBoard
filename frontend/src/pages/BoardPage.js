import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { threadService } from '../services/threadService';

const BoardPage = () => {
  const { boardCode } = useParams();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreads();
  }, [boardCode]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await threadService.getAll(boardCode);
      setThreads(response.data);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loader"></div>;
  }

  return (
    <div className="board-page">
      <h2>/{boardCode}/ - Доска обсуждений</h2>
      
      <Link to="/" className="btn btn-outline mb-3">
        ← Назад к бордам
      </Link>
      
      <button className="btn btn-primary mb-3">Создать тред</button>

      {threads.length === 0 ? (
        <div className="card">
          <p className="text-center">Нет тредов. Будь первым!</p>
        </div>
      ) : (
        threads.map((thread) => (
          <div key={thread._id} className="thread-card">
            <Link to={`/thread/${thread._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="thread-title">{thread.title}</div>
              <div className="thread-preview">
                {thread.content.substring(0, 100)}...
              </div>
              <div className="thread-meta">
                <span>Постов: {thread.postCount || 0}</span>
                <span>Последнее сообщение: {new Date(thread.lastActivity).toLocaleString()}</span>
              </div>
            </Link>
          </div>
        ))
      )}
    </div>
  );
};

export default BoardPage;