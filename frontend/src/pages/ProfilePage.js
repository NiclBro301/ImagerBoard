import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { authService } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUserData();
  }, [token, isAuthenticated, navigate]);

  const fetchUserData = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUserData(response.data.user);
    } catch (error) {
      console.error('Ошибка получения данных пользователя:', error);
      // Если ошибка авторизации - выходим
      if (error.response?.status === 401) {
        dispatch(logout());
        navigate('/login');
      }
    } finally {
      setLoading(false);
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
    return null; // ProtectedRoute уже перенаправит
  }

  // Определяем роль на русском
  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'moderator': return 'Модератор';
      case 'user': return 'Пользователь';
      default: return 'Пользователь';
    }
  };

  // Форматируем дату
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h2>👤 Личный кабинет</h2>
          <div className="profile-badge">
            {userData?.role === 'admin' && (
              <span className="badge badge-admin">Администратор</span>
            )}
            {userData?.role === 'moderator' && (
              <span className="badge badge-moderator">Модератор</span>
            )}
          </div>
        </div>
        
        <div className="profile-info">
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
                <span className="info-value role-{userData?.role}">
                  {getRoleName(userData?.role || user.role)}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Дата регистрации:</span>
                <span className="info-value">
                  {formatDate(userData?.createdAt || user.createdAt)}
                </span>
              </div>

              {userData?.lastLogin && (
                <div className="info-item">
                  <span className="info-label">Последний вход:</span>
                  <span className="info-value">
                    {formatDate(userData.lastLogin)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="info-section">
            <h4>Статистика</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Созданных тредов</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Оставленных постов</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">0</div>
                <div className="stat-label">Полученных лайков</div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <Link to="/" className="btn btn-outline">
            ← Вернуться на главную
          </Link>
          
          <button onClick={handleLogout} className="btn btn-danger">
            🔴 Выйти из системы
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;