import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { authService } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ProfilePage.css';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    threadsCount: 0,
    postsCount: 0,
    likesReceived: 0,
    unreadNotifications: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'notifications'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUserData();
    fetchStats();
    fetchNotifications();
  }, [token, isAuthenticated, navigate]);

  const fetchUserData = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUserData(response.data.user);
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
      if (error.response?.status === 401) {
        dispatch(logout());
        navigate('/login');
      }
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authService.getUserStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await authService.getNotifications();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Ошибка получения уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await authService.markNotificationAsRead(notificationId);
      fetchNotifications();
      fetchStats(); // Обновляем счётчик непрочитанных
    } catch (error) {
      console.error('Ошибка при пометке уведомления:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await authService.markAllNotificationsAsRead();
      fetchNotifications();
      fetchStats();
      toast.success('✅ Все уведомления прочитаны');
    } catch (error) {
      toast.error('❌ Ошибка при обновлении уведомлений');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'moderator': return 'Модератор';
      case 'user': return 'Пользователь';
      default: return 'Пользователь';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'like': return '👍';
      case 'reply': return '💬';
      case 'quote': return '📝';
      case 'mention': return '@';
      case 'report_resolved': return '✅';
      default: return '🔔';
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.thread) {
      return `/thread/${notification.thread}`;
    }
    return '#';
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h2>👤 Личный кабинет</h2>
          <div className="profile-badge">
            {userData?.role === 'admin' && <span className="badge badge-admin">Администратор</span>}
            {userData?.role === 'moderator' && <span className="badge badge-moderator">Модератор</span>}
          </div>
        </div>
        
        {/* 🔴 Вкладки профиля */}
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📋 Информация
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Уведомления
            {stats.unreadNotifications > 0 && (
              <span className="tab-badge">{stats.unreadNotifications}</span>
            )}
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'info' && (
            <>
              <div className="info-section">
                <h4>Основная информация</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Имя пользователя:</span>
                    <span className="info-value">{userData?.username || user.username}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{userData?.email || user.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Роль:</span>
                    <span className="info-value">{getRoleName(userData?.role || user.role)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Дата регистрации:</span>
                    <span className="info-value">{formatDate(userData?.createdAt || user.createdAt)}</span>
                  </div>
                  {userData?.lastLogin && (
                    <div className="info-item">
                      <span className="info-label">Последний вход:</span>
                      <span className="info-value">{formatDate(userData.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 🔴 ИСПРАВЛЕННАЯ СТАТИСТИКА */}
              <div className="info-section">
                <h4>Статистика</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.threadsCount}</div>
                    <div className="stat-label">Созданных тредов</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.postsCount}</div>
                    <div className="stat-label">Оставленных постов</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.likesReceived}</div>
                    <div className="stat-label">Полученных лайков</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="notifications-section">
              <div className="notifications-header">
                <h4>🔔 Уведомления</h4>
                {notifications.length > 0 && (
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={handleMarkAllAsRead}
                  >
                    ✅ Прочитать все
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>Нет новых уведомлений</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notif) => (
                    <div 
                      key={notif._id} 
                      className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                    >
                      <div className="notification-icon">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="notification-content">
                        <div className="notification-title">
                          <strong>{notif.title}</strong>
                          {!notif.isRead && <span className="badge-new">NEW</span>}
                        </div>
                        <p className="notification-message">{notif.message}</p>
                        
                        {/* 🔴 Превью цитаты для уведомлений о цитировании */}
                        {notif.type === 'quote' && notif.quotePreview && (
                          <div className="quote-preview">
                            <div className="quote-block">
                              <span className="quote-author">{notif.metadata?.author || 'Аноним'}</span>
                              <p className="quote-text">{notif.quotePreview}...</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="notification-meta">
                          <small>{formatDate(notif.createdAt)}</small>
                          {notif.fromUser?.username && (
                            <span>от @{notif.fromUser.username}</span>
                          )}
                        </div>
                      </div>
                      <div className="notification-actions">
                        {!notif.isRead && (
                          <button 
                            className="btn-icon"
                            onClick={() => handleMarkAsRead(notif._id)}
                            title="Пометить как прочитанное"
                          >
                            ✓
                          </button>
                        )}
                        {notif.thread && (
                          <Link 
                            to={`/thread/${notif.thread}`}
                            className="btn-icon"
                            title="Перейти к треду"
                          >
                            ↗
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="profile-actions">
          <Link to="/" className="btn btn-outline">← Вернуться на главную</Link>
          <button onClick={handleLogout} className="btn btn-danger">🔴 Выйти</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;