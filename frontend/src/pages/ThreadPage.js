import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { threadService } from '../services/threadService';
import { postService } from '../services/postService';
import { socketService } from '../services/socketService';
import { formatTextWithLineBreaks } from '../utils/textUtils';
import ReportButton from '../components/ReportButton';
import './ThreadPage.css';

// 🔴 Вспомогательная функция: нормализация likedBy к массиву строк (ВНЕ компонента)
const normalizeLikedBy = (likedBy) => {
  if (!likedBy) return [];
  if (!Array.isArray(likedBy)) {
    const id = typeof likedBy === 'object' && likedBy?._id 
      ? likedBy._id.toString() 
      : likedBy?.toString();
    return id ? [id] : [];
  }
  return likedBy.map(id => {
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id?._id) return id._id.toString();
    return id?.toString() || '';
  }).filter(id => id);
};

const ThreadPage = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    content: '',
    image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [quotedPosts, setQuotedPosts] = useState({});

  const cleanQuoteForDisplay = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    const quoteLines = [];
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        quoteLines.push(trimmed);
      }
    }
    if (quoteLines.length > 0) {
      const lastQuote = quoteLines[quoteLines.length - 1];
      return lastQuote.replace(/^>\s*/, '').trim();
    }
    return lines
      .filter(line => !line.trim().startsWith('>'))
      .join('\n')
      .trim();
  };

  // Загрузка треда и постов
  useEffect(() => {
    loadThread();
    loadPosts();
  }, [threadId]);

  // 🔴 SOCKET.IO: ПОДПИСКА НА СОБЫТИЯ ТРЕДА
  useEffect(() => {
    if (!threadId || !token) {
      console.log('⚠️ ThreadPage: Нет threadId или токена');
      return;
    }
    
    console.log('🔌 ThreadPage: Подписка на события треда', threadId);
    
    const subscribeToThread = () => {
      if (socketService.isConnected()) {
        socketService.joinThread(threadId);
      } else {
        console.log('⏳ Socket not connected, waiting...');
        const onConnect = () => {
          console.log('✅ Socket connected, subscribing to thread');
          socketService.joinThread(threadId);
          socketService.getSocket()?.off('connect', onConnect);
        };
        socketService.getSocket()?.on('connect', onConnect);
      }
    };
    
    subscribeToThread();
    
    // 🔹 Обработчик: новый пост
    const handleNewPost = (data) => {
      console.log('📥 ThreadPage: Получен новый пост', data);
      
      if (data.threadId === threadId) {
        setPosts(prev => {
          const exists = prev.some(p => p._id === data.post._id);
          if (exists) {
            console.log('⚠️ Пост уже есть, пропускаем');
            return prev;
          }
          return [...prev, data.post];
        });
        
        toast.info('💬 Новый ответ в треде!', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    };
    
    // 🔹 Обработчик: удаление поста
    const handlePostDeleted = (data) => {
      console.log('📥 ThreadPage: Пост удалён', data);
      
      if (data.threadId === threadId) {
        setPosts(prev => {
          const filtered = prev.filter(p => p._id !== data.postId);
          if (filtered.length !== prev.length) {
            toast.info('🗑️ Пост удалён', {
              position: 'top-right',
              autoClose: 2000,
            });
            return filtered;
          }
          return prev;
        });
      }
    };
    
    // 🔹 Обработчик: лайк поста
    const handlePostLiked = (data) => {
      console.log('📥 ThreadPage: Пост лайкнут', data);
      console.log('📊 likedBy:', data.likedBy);
      
      if (data.threadId === threadId) {
        setPosts(prev => prev.map(p => {
          if (p._id === data.postId) {
            return {
              ...p,
              likes: typeof data.likes === 'number' ? data.likes : p.likes,
              likedBy: normalizeLikedBy(data.likedBy),
            };
          }
          return p;
        }));
      }
    };
    
    // 🔹 Обработчик: удаление лайка
    const handlePostUnliked = (data) => {
      console.log('📥 ThreadPage: Лайк убран', data);
      console.log('📊 likedBy:', data.likedBy);
      
      if (data.threadId === threadId) {
        setPosts(prev => prev.map(p => {
          if (p._id === data.postId) {
            return {
              ...p,
              likes: typeof data.likes === 'number' ? data.likes : p.likes,
              likedBy: normalizeLikedBy(data.likedBy),
            };
          }
          return p;
        }));
      }
    };
    
    // 🔹 Подписываемся на события
    socketService.on('new-post', handleNewPost);
    socketService.on('post-deleted', handlePostDeleted);
    socketService.on('post-liked', handlePostLiked);
    socketService.on('post-unliked', handlePostUnliked);
    
    // 🔹 Очистка при размонтировании
    return () => {
      console.log('🔌 ThreadPage: Отписка от событий треда', threadId);
      socketService.off('new-post', handleNewPost);
      socketService.off('post-deleted', handlePostDeleted);
      socketService.off('post-liked', handlePostLiked);
      socketService.off('post-unliked', handlePostUnliked);
    };
  }, [threadId, token]);

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
      
      // 🔴 НОРМАЛИЗАЦИЯ: гарантируем, что likedBy — массив строк
      const normalizedPosts = (response.data.posts || []).map(post => ({
        ...post,
        likedBy: normalizeLikedBy(post.likedBy),
      }));
      
      console.log('✅ Posts loaded:', normalizedPosts.length);
      setPosts(normalizedPosts);
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

  const handleQuote = (post) => {
    if (quotedPosts[post._id]) {
      toast.warning('⚠️ Вы уже цитируете этот пост', {
        position: 'top-right',
        autoClose: 2500,
      });
      return;
    }

    let cleanContent = post.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    const lines = cleanContent.split('\n');
    const quoteLines = [];
    const textLines = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        quoteLines.push(trimmed.replace(/^>\s*/, '').trim());
      } else if (trimmed.length > 0) {
        textLines.push(trimmed);
      }
    });
    
    let finalContent = '';
    if (textLines.length > 0) {
      finalContent = textLines.join('\n').trim();
    } else if (quoteLines.length > 0) {
      finalContent = quoteLines[quoteLines.length - 1];
    } else {
      finalContent = 'Без текста';
    }

    setQuotedPosts(prev => ({
      ...prev,
      [post._id]: {
        postId: post._id,
        author: post.author || 'Аноним',
        content: finalContent || 'Без текста',
        timestamp: new Date(post.createdAt).toLocaleString('ru-RU'),
      }
    }));

    toast.success('📝 Цитата добавлена', {
      position: 'top-right',
      autoClose: 2000,
    });
  };

  const handleRemoveQuote = (postId) => {
    setQuotedPosts(prev => {
      const newQuotes = { ...prev };
      delete newQuotes[postId];
      return newQuotes;
    });
  };

  const handleLike = async (postId) => {
    try {
      console.log('👍 Liking post:', postId);
      await postService.like(postId);
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
      console.log('👎 Unliking post:', postId);
      await postService.unlike(postId);
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

  const handleDeletePost = async (postId, postAuthor) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить пост "${postAuthor}"?`);
    if (!confirmed) return;

    try {
      await postService.delete(postId);
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
      
      let finalContent = formData.content;
      
      const quotedPostsArray = Object.values(quotedPosts);
      if (quotedPostsArray.length > 0) {
        const quotePrefix = quotedPostsArray.map(quote => 
          `> ${quote.author}\n> ${quote.content.replace(/\n/g, ' ')}`
        ).join('\n\n');
        
        finalContent = quotePrefix + '\n\n' + formData.content;
      }
      
      formDataToSend.append('content', finalContent);
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      await postService.create(threadId, formDataToSend);
      
      setFormData({ content: '', image: null });
      setImagePreview(null);
      setQuotedPosts({});
      
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

      <div className="thread-main-post card">
        <div className="post-header">
          <div className="post-author">
            {thread?.user ? (
              <>
                {thread.user.avatar ? (
                  <img 
                    src={`http://localhost:5000${thread.user.avatar}`} 
                    alt={thread.author}
                    className="post-author-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentElement.querySelector('.post-author-avatar-placeholder');
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="post-author-avatar-placeholder">
                    {thread.author?.charAt(0).toUpperCase()}
                  </div>
                )}
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

      <div className="posts-section">
        <h2>Ответы ({posts.length})</h2>
        
        {posts.map((post) => {
          const currentUserId = user?._id?.toString();
          const postLikedBy = normalizeLikedBy(post.likedBy);
          const hasLiked = isAuthenticated && currentUserId && Array.isArray(postLikedBy) && postLikedBy.includes(currentUserId);
          
          return (
            <div key={post._id} className="post-card">
              <div className="post-header">
                <div className={`post-author ${post.user ? 'registered' : 'anonymous'}`}>
                  {post.user ? (
                    <>
                      {post.user.avatar ? (
                        <img 
                          src={`http://localhost:5000${post.user.avatar}`} 
                          alt={post.author}
                          className="post-author-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement.querySelector('.post-author-avatar-placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div className="post-author-avatar-placeholder">
                          {post.author?.charAt(0).toUpperCase()}
                        </div>
                      )}
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
                    disabled={!!quotedPosts[post._id]}
                  >
                    💬
                  </button>
                  
                  <ReportButton postId={post._id} postAuthor={post.author} />
                  
                  <button 
                    className={`btn-like ${hasLiked ? 'liked' : ''}`} 
                    onClick={() => hasLiked ? handleUnlike(post._id) : handleLike(post._id)}
                    title={hasLiked ? "Убрать лайк" : "Нравится"}
                    disabled={!isAuthenticated}
                  >
                    👍 {typeof post.likes === 'number' ? post.likes : 0}
                  </button>
                  
                  {hasLiked && (
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
          );
        })}
      </div>

      <div className="form-author-indicator">
        {isAuthenticated ? (
          <span>👤 Вы публикуете как: <strong>{user?.username}</strong> <em>(зарегистрирован)</em></span>
        ) : (
          <span>👤 Вы публикуете как: <strong>Аноним</strong> <em>(<Link to="/login">войдите</Link> для сохранения истории)</em></span>
        )}
      </div>

      {Object.keys(quotedPosts).length > 0 && (
        <div className="quotes-preview">
          <h4>📋 Цитаты:</h4>
          {Object.values(quotedPosts).map((quote) => (
            <div key={quote.postId} className="quote-block-compact">
              <div className="quote-header">
                <span className="quote-author">{quote.author}</span>
                <span className="quote-time">{quote.timestamp}</span>
                <button className="btn-remove-quote" onClick={() => handleRemoveQuote(quote.postId)}>✕</button>
              </div>
              <p className="quote-text">{quote.content}</p>
            </div>
          ))}
        </div>
      )}

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