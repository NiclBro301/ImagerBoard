import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { boardService } from '../services/boardService';
import { threadService } from '../services/threadService';
import './BoardPage.css';

const BoardPage = () => {
  const { boardCode } = useParams();
  const navigate = useNavigate();
  
  // 🔴 Проверка авторизации из Redux
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [board, setBoard] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadBoard();
    loadThreads();
  }, [boardCode]);

  const loadBoard = async () => {
    try {
      const response = await boardService.getByCode(boardCode);
      setBoard(response.data.board);
    } catch (error) {
      console.error('Error loading board:', error);
      toast.error('Борд не найден', {
        position: 'top-right',
        autoClose: 3000,
      });
      navigate('/');
    }
  };

  const loadThreads = async () => {
    try {
      setLoading(true);
      const response = await threadService.getAllByBoardCode(boardCode);
      setThreads(response.data.threads || response.data || []);
    } catch (error) {
      console.error('Error loading threads:', error);
      toast.error('Ошибка при загрузке тредов', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, image: file });

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null });
    setImagePreview(null);
    document.getElementById('thread-image').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('author', formData.author || 'Аноним');
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      await threadService.create(boardCode, formDataToSend);
      
      setFormData({ title: '', content: '', author: '', image: null });
      setImagePreview(null);
      setShowForm(false);
      loadThreads();
      
      toast.success('✅ Тред успешно создан!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка при создании треда', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  if (loading && !board) {
    return <div className="loader"></div>;
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <Link to="/" className="btn btn-outline">
          ← Назад к бордам
        </Link>
        
        <h1>
          /{board?.code}/ — {board?.name}
        </h1>
        
        {board?.description && (
          <p className="board-description">{board.description}</p>
        )}
      </div>

      <div className="board-actions">
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Отмена' : '➕ Создать тред'}
        </button>
      </div>

      {/* 🔴 Индикатор автора */}
      <div className="form-author-indicator">
        {isAuthenticated && user ? (
          <span>
            👤 Вы публикуете как: <strong>{user.username}</strong> <em>(зарегистрирован)</em>
          </span>
        ) : (
          <span>
            👤 Вы публикуете как: <strong>Аноним</strong> <em>(<Link to="/login">войдите</Link> для сохранения истории)</em>
          </span>
        )}
      </div>

      {/* Форма создания треда */}
      {showForm && (
        <div className="thread-form card">
          <h3>Создать новый тред</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Заголовок *</label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-control"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Заголовок треда"
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Сообщение *</label>
              <textarea
                id="content"
                name="content"
                className="form-control"
                rows="6"
                value={formData.content}
                onChange={handleChange}
                required
                placeholder="Содержимое треда..."
                maxLength={5000}
              ></textarea>
            </div>

            {/* Поле имени только для анонимов */}
            {!isAuthenticated && (
              <div className="form-group">
                <label htmlFor="author">Имя (опционально)</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  className="form-control"
                  value={formData.author}
                  onChange={handleChange}
                  placeholder="Аноним"
                  maxLength={30}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="thread-image">Изображение (опционально)</label>
              <input
                type="file"
                id="thread-image"
                name="image"
                className="form-control"
                accept="image/*"
                onChange={handleImageChange}
              />
              
              {imagePreview && (
                <div className="image-preview">
                  <h5>Предпросмотр изображения:</h5>
                  <div className="preview-container">
                    <img src={imagePreview} alt="Предпросмотр" />
                    <button 
                      type="button" 
                      className="btn-remove-image"
                      onClick={handleRemoveImage}
                    >
                      ✕ Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary">
                Создать тред
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список тредов */}
      <div className="threads-section">
        <h2>Треды ({threads.length})</h2>
        
        {loading ? (
          <div className="loader"></div>
        ) : threads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Нет тредов</h3>
            <p>Будьте первым, кто создаст тред на этом борде!</p>
          </div>
        ) : (
          <div className="threads-list">
            {threads.map((thread) => (
              <div key={thread._id} className="thread-card">
                <div className="thread-header">
                  <div className="thread-title">
                    {thread.isPinned && <span className="pin-icon" title="Закреплён">📌</span>}
                    <Link to={`/thread/${thread._id}`}>
                      {thread.title}
                    </Link>
                  </div>
                  <div className="thread-meta">
                    <span className="thread-author">
                      👤 {thread.author || 'Аноним'}
                      {thread.user && <span className="author-badge" title="Зарегистрированный">✓</span>}
                    </span>
                    <span className="thread-date">
                      {new Date(thread.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>
                
                <div className="thread-preview">
                  {thread.content?.substring(0, 200)}
                  {thread.content?.length > 200 ? '...' : ''}
                </div>
                
                <div className="thread-stats">
                  <span className="stat">💬 {thread.postCount || 0} ответов</span>
                  <span className="stat">📅 {thread.lastActivity ? new Date(thread.lastActivity).toLocaleString('ru-RU') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardPage;