import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { formatTextWithLineBreaks } from '../utils/textUtils';
import { socketService } from '../services/socketService';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, token } = useSelector((state) => state.auth);
  
  // 🔴 Состояния
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    posts: 0,
    threads: 0,
    likesReceived: 0,
    reportsReceived: 0,
    reportsSubmitted: 0,
  });
  const [notifications, setNotifications] = useState([]);
  
  // 🔴 Состояния загрузки
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  // 🔴 Состояния для аватара
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Загрузка данных пользователя
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await authService.getMe();
      setUserData(response.data.user);
      if (response.data.user.avatar) {
        setAvatarPreview(`http://localhost:5000${response.data.user.avatar}`);
      }
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
      toast.error('Не удалось загрузить профиль', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики пользователя
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await authService.getStats();
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      setStats({
        posts: 0,
        threads: 0,
        likesReceived: 0,
        reportsReceived: 0,
        reportsSubmitted: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Загрузка уведомлений
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await authService.getNotifications({ limit: 10 });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Ошибка получения уведомлений:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // 🔴 Загрузка всех данных при монтировании
  useEffect(() => {
    if (token && user?._id) {
      fetchUserData();
      fetchStats();
      fetchNotifications();
    }
  }, [token, user?._id]);

  // 🔴 SOCKET.IO: Автообновление списка уведомлений
  useEffect(() => {
    if (!token) return;
    
    console.log('🔌 ProfilePage: Подписка на уведомления');
    
    const handleNewNotification = (data) => {
      console.log('📥 ProfilePage: Новое уведомление', data);
      
      setNotifications(prev => {
        const exists = prev.some(n => n._id === data._id);
        if (exists) return prev;
        return [data, ...prev];
      });
    };
    
    socketService.on('notification', handleNewNotification);
    
    const handleCustomRefresh = () => {
      console.log('🔄 ProfilePage: Custom refresh event received');
      fetchNotifications();
    };
    window.addEventListener('profile-notifications-refresh', handleCustomRefresh);
    
    return () => {
      console.log('🔌 ProfilePage: Отписка от уведомлений');
      socketService.off('notification', handleNewNotification);
      window.removeEventListener('profile-notifications-refresh', handleCustomRefresh);
    };
  }, [token]);

  // 🔴 Обработка выбора файла аватара
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 🔴 Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
    
    // 🔴 Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс 5MB)', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
    
    setAvatarFile(file);
    
    // 🔴 Предпросмотр
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 🔴 Загрузка аватара
  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error('Выберите файл для загрузки', {
        position: 'top-right',
        autoClose: 3000,
      });
      return;
    }
    
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      await authService.uploadAvatar(formData);
      
      // 🔴 Обновляем данные пользователя
      await fetchUserData();
      
      toast.success('✅ Аватар загружен!', {
        position: 'top-right',
        autoClose: 3000,
      });
      
      // 🔴 Очищаем
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.message || '❌ Ошибка при загрузке аватара', {
        position: 'top-right',
        autoClose: 4000,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 🔴 Удаление аватара
  const handleDeleteAvatar = async () => {
    const confirmed = window.confirm('Вы уверены, что хотите удалить аватар?');
    if (!confirmed) return;
    
    try {
      await authService.deleteAvatar();
      await fetchUserData();
      setAvatarPreview(null);
      
      toast.success('✅ Аватар удалён!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error('❌ Ошибка при удалении аватара', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  // 🔴 Обработка отметки уведомления как прочитанного
  const handleMarkAsRead = async (notificationId) => {
    try {
      await authService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Ошибка при отметке уведомления:', error);
    }
  };

  // 🔴 Обработка удаления уведомления
  const handleDeleteNotification = async (notificationId) => {
    try {
      const notif = notifications.find(n => n._id === notificationId);
      
      if (notif && !notif.isRead) {
        await authService.markNotificationAsRead(notificationId);
      }
      
      await authService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      if (notif && !notif.isRead) {
        window.dispatchEvent(new CustomEvent('unread-count-decrement'));
      }
    } catch (error) {
      console.error('Ошибка при удалении уведомления:', error);
    }
  };

  // 🔴 Удаление всех уведомлений
const handleDeleteAllNotifications = async () => {
  try {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    await authService.deleteAllNotifications();
    setNotifications([]);
    
    // 🔴 Обновляем счётчик в App.js
    if (unreadCount > 0) {
      window.dispatchEvent(new CustomEvent('unread-count-reset'));
    }
    
    toast.success('✅ Все уведомления удалены!', {
      position: 'top-right',
      autoClose: 2000,
    });
  } catch (error) {
    console.error('Ошибка при удалении всех уведомлений:', error);
    toast.error('❌ Ошибка при удалении уведомлений', {
      position: 'top-right',
      autoClose: 3000,
    });
  }
};

  // 🔴 Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 🔴 Пока загружаются данные
  if (loading) {
    return (
      <div className="profile-page">
        <div className="loader-container">
          <div className="loader"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>👤 Профиль пользователя</h1>
        
        {/* 🔴 СЕКЦИЯ АВАТАРА */}
        <div className="avatar-section">
          <div className="avatar-preview">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Аватар" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {userData?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="avatar-controls">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="avatar-input"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className="btn btn-outline">
              📷 Выбрать фото
            </label>
            
            {avatarFile && (
              <>
                <button 
                  className="btn btn-primary" 
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? '⏳ Загрузка...' : '✅ Загрузить'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(userData?.avatar ? `http://localhost:5000${userData.avatar}` : null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕ Отмена
                </button>
              </>
            )}
            
            {userData?.avatar && !avatarFile && (
              <button className="btn btn-danger" onClick={handleDeleteAvatar}>
                🗑️ Удалить
              </button>
            )}
          </div>
          
          <small className="avatar-hint">
            💡 Максимум 5MB, рекомендуется квадратное изображение
          </small>
        </div>
        
        <div className="user-details">
          <h2>{userData?.username || 'Пользователь'}</h2>
          <p className="user-email">{userData?.email}</p>
          <p className="user-role">
            Роль: <strong>
              {userData?.role === 'admin' ? '👑 Администратор' : 
               userData?.role === 'moderator' ? '🛡️ Модератор' : '👤 Пользователь'}
            </strong>
          </p>
          <p className="user-status">
            Статус: <strong className={userData?.isActive ? 'status-active' : 'status-banned'}>
              {userData?.isActive ? '✅ Активен' : '🔒 Забанен'}
            </strong>
          </p>
        </div>
      </div>

      {/* 🔴 СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ */}
      <div className="stats-section">
        <h3>📊 Статистика</h3>
        {loadingStats ? (
          <div className="loader-small"></div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.posts ?? 0}</div>
              <div className="stat-label">Постов</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.threads ?? 0}</div>
              <div className="stat-label">Тредов</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.likesReceived ?? 0}</div>
              <div className="stat-label">Лайков получено</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.reportsReceived ?? 0}</div>
              <div className="stat-label">Жалоб на вас</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.reportsSubmitted ?? 0}</div>
              <div className="stat-label">Жалоб подано</div>
            </div>
          </div>
        )}
      </div>

      {/* 🔴 ИНФОРМАЦИЯ ОБ АККАУНТЕ */}
      <div className="account-info">
        <h3>ℹ️ Информация об аккаунте</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Дата регистрации:</label>
            <span>{formatDate(userData?.createdAt)}</span>
          </div>
          <div className="info-item">
            <label>Последний вход:</label>
            <span>{formatDate(userData?.lastLogin)}</span>
          </div>
          {userData?.bannedUntil && (
            <div className="info-item">
              <label>Бан до:</label>
              <span className="text-danger">
                {userData.bannedUntil === null 
                  ? '∞ Перманентно' 
                  : formatDate(userData.bannedUntil)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 🔴 УВЕДОМЛЕНИЯ */}
      <div className="notifications-section">
        <div className="notifications-header">
          <h3>🔔 Уведомления</h3>
          <div className="notifications-actions">
            {notifications.length > 0 && (
              <span className="notifications-count">
                {notifications.filter(n => !n.isRead).length} новых
              </span>
            )}
            {notifications.length > 0 && (
              <button 
                className="btn btn-danger btn-sm" 
                onClick={handleDeleteAllNotifications}
              >
                🗑️ Удалить все
              </button>
            )}
          </div>
        </div>
        
        {loadingNotifications ? (
          <div className="loader-small"></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <p>📭 Уведомлений нет</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-type">
                      {notification.type === 'quote' && '💬 Цитата'}
                      {notification.type === 'reply' && '↩️ Ответ'}
                      {notification.type === 'like' && '👍 Лайк'}
                      {notification.type === 'report' && '⚠️ Жалоба'}
                    </span>
                    <span className="notification-date">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  
                  <h4 className="notification-title">{notification.title}</h4>
                  <p className="notification-message">{notification.message}</p>
                  
                  {notification.quotePreview && (
                    <div className="quote-preview">
                      <small>{formatTextWithLineBreaks(notification.quotePreview).substring(0, 150)}...</small>
                    </div>
                  )}
                </div>
                
                <div className="notification-actions">
                  {!notification.isRead && (
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleMarkAsRead(notification._id)}
                    >
                      ✓ Прочитано
                    </button>
                  )}
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteNotification(notification._id)}
                  >
                    ✕ Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;