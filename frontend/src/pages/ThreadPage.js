import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { threadService } from '../services/threadService';
import { postService } from '../services/postService';
import { formatTextWithLineBreaks } from '../utils/textUtils';
import ReportButton from '../components/ReportButton';
import './ThreadPage.css';

const ThreadPage = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    content: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [quotedPostIds, setQuotedPostIds] = useState(new Set());

  useEffect(() => {
    loadThread();
    loadPosts();
  }, [threadId]);

  const loadThread = async () => {
    try {
      const response = await threadService.getById(threadId);
      setThread(response.data.thread);
    } catch (error) {
      console.error('Error loading thread:', error);
      navigate('/');
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postService.getAll(threadId);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error loading posts:', error);
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
    document.getElementById('post-image').value = '';
  };

  const handleLike = async (postId) => {
    try {
      await postService.like(postId);
      loadPosts();
      toast.success('👍 Лайк поставлен!', {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка при лайке', {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleUnlike = async (postId) => {
    try {
      await postService.unlike(postId);
      loadPosts();
      toast.success('👎 Лайк убран', {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (error) {
      console.error('Error unliking post:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка', {
        position: 'top-right',
        autoClose: 3000,
      });
    }
  };

  const handleQuote = (post) => {
  if (quotedPostIds.has(post._id)) {
    toast.warning('⚠️ Вы уже цитируете этот пост', {
      position: 'top-right',
      autoClose: 2500,
    });
    return;
  }

  // 🔴 Форматируем цитату как блок (Telegram-style)
  const quoteText = `> ${post.author || 'Аноним'}\n> ${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}\n\n`;
  
  setFormData({
    ...formData,
    content: formData.content + quoteText,
  });

  setQuotedPostIds(prev => new Set(prev).add(post._id));
  
  toast.success('📝 Цитата добавлена', {
    position: 'top-right',
    autoClose: 2000,
  });
};

  const handleDeletePost = async (postId, postAuthor) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить пост "${postAuthor}"?`);
    if (!confirmed) return;

    try {
      await postService.delete(postId);
      loadPosts();
      toast.success('🗑️ Пост успешно удалён!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка при удалении поста', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('content', formData.content);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      await postService.create(threadId, formDataToSend);
      
      setFormData({ content: '', image: null });
      setImagePreview(null);
      setQuotedPostIds(new Set());
      loadPosts();
      
      toast.success('✅ Пост успешно создан!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка при создании поста', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  if (loading && !thread) {
    return <div className="loader"></div>;
  }

  return (
    <div className="thread-page">
      <div className="thread-header">
        <Link to="/" className="btn btn-outline">
          ← Назад к бордам
        </Link>
        
        <h1>{thread?.title}</h1>
        
        <div className="thread-info">
          <span className="thread-board">
            /{thread?.board?.code}/ — {thread?.board?.name}
          </span>
        </div>
      </div>

      {/* Основной пост треда */}
      <div className="thread-main-post card">
        <div className="post-header">
          <div className="post-author">
            {thread?.user ? (
              <>
                <span className="author-name">{thread?.author}</span>
                <span className="author-badge" title="Зарегистрированный пользователь">✓</span>
              </>
            ) : (
              <>
                <span className="author-name">Аноним</span>
                {thread?.anonymousHash && (
                  <span className="author-id" title="Уникальный идентификатор">#{thread.anonymousHash.slice(0, 6)}</span>
                )}
              </>
            )}
            <span className="post-date">
              {new Date(thread?.createdAt).toLocaleString('ru-RU')}
            </span>
          </div>
          
          {(isAuthenticated && (user?.role === 'admin' || user?.role === 'moderator')) && (
            <div className="post-actions">
              <button className="btn-action" title="Закрепить тред">
                📌
              </button>
              <button className="btn-action" title="Удалить тред">
                🗑️
              </button>
            </div>
          )}
        </div>
        
        <div className="post-content">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: formatTextWithLineBreaks(thread?.content) 
            }} 
          />
          
          {thread?.image && (
            <img 
              src={`http://localhost:5000${thread.image}`} 
              alt="Изображение треда" 
              className="post-image" 
            />
          )}
        </div>
      </div>

      {/* Список ответов */}
      <div className="posts-section">
        <h2>Ответы ({posts.length})</h2>
        
        {posts.map((post) => (
          <div key={post._id} className="post-card">
            <div className="post-header">
              <div className={`post-author ${post.user ? 'registered' : 'anonymous'}`}>
                {post.user ? (
                  <>
                    <span className="author-name">{post.author}</span>
                    <span className="author-badge" title="Зарегистрированный пользователь">✓</span>
                  </>
                ) : (
                  <>
                    <span className="author-name">Аноним</span>
                    {post.anonymousHash && (
                      <span className="author-id" title="Уникальный идентификатор">#{post.anonymousHash.slice(0, 6)}</span>
                    )}
                  </>
                )}
                <span className="post-date">
                  {new Date(post.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
              
              <div className="post-actions">
                <button 
                  className="btn-action" 
                  title="Цитировать"
                  onClick={() => handleQuote(post)}
                  disabled={quotedPostIds.has(post._id)}
                >
                  💬
                </button>
                
                <ReportButton postId={post._id} postAuthor={post.author} />
                
                <button 
                  className={`btn-like ${post.likes > 0 ? 'liked' : ''}`} 
                  onClick={() => handleLike(post._id)}
                  title="Нравится"
                >
                  👍 {post.likes}
                </button>
                {post.likes > 0 && (
                  <button 
                    className="btn-unlike" 
                    onClick={() => handleUnlike(post._id)}
                    title="Убрать лайк"
                  >
                    👎
                  </button>
                )}
                
                {(isAuthenticated && (
                 (user?.role === 'admin' || user?.role === 'moderator') || 
                  (post.user && post.user.toString() === user?._id.toString())
                )) && (
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDeletePost(post._id, post.author)}
                    title="Удалить пост"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            
            <div className="post-content">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: formatTextWithLineBreaks(post.content) 
                }} 
              />
              
              {post.image && (
                <img 
                  src={`http://localhost:5000${post.image}`} 
                  alt="Изображение поста" 
                  className="post-image" 
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Индикатор автора в форме */}
      <div className="form-author-indicator">
        {isAuthenticated ? (
          <span>👤 Вы публикуете как: <strong>{user?.username}</strong> <em>(зарегистрирован)</em></span>
        ) : (
          <span>👤 Вы публикуете как: <strong>Аноним</strong> <em>(<Link to="/login">войдите</Link> для сохранения истории)</em></span>
        )}
      </div>

      {/* Форма ответа */}
      <div className="reply-form card">
        <h3>Ответить в тред</h3>
        <form onSubmit={handleSubmit}>
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
              placeholder="Ваш ответ..."
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="post-image">Изображение (опционально)</label>
            <input
              type="file"
              id="post-image"
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

          <button type="submit" className="btn btn-primary">
            Отправить ответ
          </button>
        </form>
      </div>
    </div>
  );
};

export default ThreadPage;