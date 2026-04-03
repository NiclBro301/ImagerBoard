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
  const [quotedPosts, setQuotedPosts] = useState({});

  // 🔴 ИСПРАВЛЕННАЯ функция очистки цитаты - берём только ПОСЛЕДНИЙ уровень
  const cleanQuoteForDisplay = (text) => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const quoteLines = [];
    
    // Собираем все строки-цитаты
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        quoteLines.push(trimmed);
      }
    }
    
    // Если есть цитаты, берём ПОСЛЕДНЮЮ (самую свежую)
    if (quoteLines.length > 0) {
      const lastQuote = quoteLines[quoteLines.length - 1];
      // Убираем префикс > и возвращаем
      return lastQuote.replace(/^>\s*/, '').trim();
    }
    
    // Если нет цитат, возвращаем весь текст без цитат
    return lines
      .filter(line => !line.trim().startsWith('>'))
      .join('\n')
      .trim();
  };

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
      setPosts(response.data.posts || []);
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

  // 🔴 ИСПРАВЛЕННАЯ функция цитирования
 const handleQuote = (post) => {
  if (quotedPosts[post._id]) {
    toast.warning('⚠️ Вы уже цитируете этот пост', {
      position: 'top-right',
      autoClose: 2500,
    });
    return;
  }

  console.log('=== HANDLEQUOTE ===');
  console.log('📝 Исходный post.content:', post.content);
  console.log('👤 post.author:', post.author);
  
  // Очищаем от HTML тегов
  let cleanContent = post.content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  console.log('🧹 После очистки HTML:', cleanContent);
  
  const lines = cleanContent.split('\n');
  console.log('📋 Строки:', lines);
  
  const quoteLines = [];
  const textLines = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      quoteLines.push({ index, text: trimmed.replace(/^>\s*/, '').trim() });
      console.log(`💬 Цитата [${index}]:`, trimmed);
    } else if (trimmed.length > 0) {
      textLines.push({ index, text: trimmed });
      console.log(`📝 Текст [${index}]:`, trimmed);
    }
  });
  
  // 🔴 ИСПРАВЛЕНО: Приоритет — НОВЫЙ ТЕКСТ, не цитаты!
  let finalContent = '';
  
  if (textLines.length > 0) {
    // 🔹 ЕСТЬ НОВЫЙ ТЕКСТ — берём его (это самый свежий ответ)
    finalContent = textLines.map(t => t.text).join('\n').trim();
    console.log('✅ Выбран НОВЫЙ ТЕКСТ:', finalContent);
  } else if (quoteLines.length > 0) {
    // 🔹 Нет текста — берём ПОСЛЕДНЮЮ цитату
    finalContent = quoteLines[quoteLines.length - 1].text;
    console.log('✅ Выбрана последняя цитата:', finalContent);
  } else {
    finalContent = 'Без текста';
    console.log('⚠️ Пустой пост');
  }
  
  console.log('🎯 Итоговый контент для цитаты:', finalContent);
  console.log('===================');

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
                  disabled={!!quotedPosts[post._id]}
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