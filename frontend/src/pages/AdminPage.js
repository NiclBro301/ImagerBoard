import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './AdminPage.css';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Проверяем роль (на всякий случай, хотя RoleRoute уже проверил)
  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <h3>Доступ запрещен</h3>
          <p>У вас нет прав для просмотра этой страницы</p>
          <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">🛠️ Панель модерации</h2>
        
        <div className="admin-header">
          <div className="admin-user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-role">
                {user?.role === 'admin' ? 'Администратор' : 'Модератор'}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Дашборд
          </button>
          <button 
            className={`tab-btn ${activeTab === 'boards' ? 'active' : ''}`}
            onClick={() => setActiveTab('boards')}
          >
            📋 Борды
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            ⚠️ Жалобы
          </button>
          <button 
            className={`tab-btn ${activeTab === 'bans' ? 'active' : ''}`}
            onClick={() => setActiveTab('bans')}
          >
            🚫 Баны
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              <h3>Статистика</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">4</div>
                  <div className="stat-label">Бордов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Тредов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Постов</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Жалоб</div>
                </div>
              </div>

              <div className="quick-actions">
                <h4>Быстрые действия</h4>
                <div className="actions-grid">
                  <Link to="/admin" className="action-btn">
                    <span className="action-icon">➕</span>
                    <span>Добавить борд</span>
                  </Link>
                  <Link to="/admin" className="action-btn">
                    <span className="action-icon">📝</span>
                    <span>Создать тред</span>
                  </Link>
                  <Link to="/admin" className="action-btn">
                    <span className="action-icon">⚠️</span>
                    <span>Проверить жалобы</span>
                  </Link>
                  <Link to="/admin" className="action-btn">
                    <span className="action-icon">🔒</span>
                    <span>Управление банами</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'boards' && (
            <div className="boards-management">
              <h3>Управление бордами</h3>
              <p>Здесь будет список всех бордов и возможность их редактировать.</p>
              <button className="btn btn-primary">Добавить борд</button>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-management">
              <h3>Жалобы пользователей</h3>
              <p>Здесь будет список всех жалоб на посты.</p>
              <button className="btn btn-primary">Проверить жалобы</button>
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="bans-management">
              <h3>Система банов</h3>
              <p>Здесь будет управление банами пользователей и IP адресов.</p>
              <button className="btn btn-primary">Выдать бан</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;