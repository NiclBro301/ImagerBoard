import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { boardService } from '../services/boardService';
import BanModal from '../components/BanModal';
import ReportsModal from '../components/ReportsModal';
import './AdminPage.css';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Состояния для жалоб
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState('pending');
  const [pendingCount, setPendingCount] = useState(0);

  // Состояния для пользователей
  const [users, setUsers] = useState([]);
  const [anonymousUsers, setAnonymousUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [anonPage, setAnonPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [anonTotalPages, setAnonTotalPages] = useState(1);
  const [userSort, setUserSort] = useState('reports');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  // Состояния для бордов
  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [boardFormData, setBoardFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  // Состояния для статистики
  const [stats, setStats] = useState({
    boardsCount: 0,
    threadsCount: 0,
    postsCount: 0,
    pendingReports: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Загрузка статистики при входе на дашборд
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    }
  }, [activeTab]);

  // Загрузка жалоб
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, reportFilter]);

  // Загрузка пользователей
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, userPage, userSort, userSearch]);

  // Загрузка анонимов
  useEffect(() => {
    if (activeTab === 'anonymous') {
      loadAnonymousUsers();
    }
  }, [activeTab, anonPage]);

  // Загрузка бордов
  useEffect(() => {
    if (activeTab === 'boards') {
      loadBoards();
    }
  }, [activeTab]);

  // Вспомогательная функция для извлечения данных
  const extractData = (response, key = null) => {
    if (!response?.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (key && response.data[key]) return response.data[key];
    if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    return [];
  };

  // Загрузка статистики
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      
      const boardsRes = await boardService.getAll();
      const boardsData = extractData(boardsRes);
      
      const reportsRes = await reportService.getAll({ status: 'pending', page: 1, limit: 1 });
      const pendingTotal = reportsRes?.data?.total ?? reportsRes?.data?.count ?? 0;
      
      let totalThreads = 0;
      let totalPosts = 0;
      
      boardsData.forEach(board => {
        totalThreads += board.threadCount ?? board.threadsCount ?? 0;
        totalPosts += board.postCount ?? board.postsCount ?? 0;
      });

      setStats({
        boardsCount: boardsData.length,
        threadsCount: totalThreads,
        postsCount: totalPosts,
        pendingReports: pendingTotal,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({ boardsCount: 0, threadsCount: 0, postsCount: 0, pendingReports: 0 });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const response = await reportService.getAll({ status: reportFilter });
      setReports(extractData(response, 'reports'));
      
      if (reportFilter === 'pending' || reportFilter === '') {
        const pendingResponse = await reportService.getAll({ status: 'pending' });
        setPendingCount(pendingResponse?.data?.total ?? pendingResponse?.data?.count ?? 0);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await userService.getAll({
        page: userPage,
        limit: 20,
        sortBy: userSort,
        search: userSearch,
      });
      setUsers(extractData(response, 'users'));
      setUserTotalPages(response?.data?.pages ?? 1);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAnonymousUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await userService.getAnonymous({
        page: anonPage,
        limit: 20,
        sortBy: 'reports',
      });
      setAnonymousUsers(extractData(response, 'users'));
      setAnonTotalPages(response?.data?.pages ?? 1);
    } catch (error) {
      console.error('Error loading anonymous users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadBoards = async () => {
  try {
    setBoardsLoading(true);
    const response = await boardService.getAll();
    
    // 🔴 ИСПРАВЛЕНО: правильно извлекаем массив бордов
    const boardsData = response.data?.boards || response.data?.data || response.data || [];
    setBoards(Array.isArray(boardsData) ? boardsData : []);
    
    console.log('✅ loadBoards: загружено бордов:', boardsData.length);
  } catch (error) {
    console.error('Error loading boards:', error);
    setBoards([]);
  } finally {
    setBoardsLoading(false);
  }
};

  // Обработка жалобы: ОДОБРИТЬ
  const handleApprove = async (reportId) => {
    const notes = prompt('Введите заметки для модератора (опционально):', '');
    if (notes === null) return;
    try {
      await reportService.processWithBan(reportId, { action: 'approve', notes });
      loadReports();
      toast.success('✅ Жалоба одобрена, пост удалён!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при одобрении жалобы', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  // Обработка жалобы: ОТКЛОНИТЬ
  const handleReject = async (reportId) => {
    const notes = prompt('Введите причину отклонения (опционально):', '');
    if (notes === null) return;
    try {
      await reportService.reject(reportId, { notes });
      loadReports();
      toast.success('❌ Жалоба отклонена', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при отклонении жалобы', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  // Обработчики для управления пользователями
  const handleViewReports = (userData) => {
    setSelectedUser(userData);
    setShowReportsModal(true);
  };

  const handleBanClick = (userData) => {
    setSelectedUser(userData);
    setShowBanModal(true);
  };

  const handleQuickUnban = async (userData) => {
    const confirmed = window.confirm(`Разбанить ${userData?.username || `IP ${userData?.ipHash}`}?`);
    if (!confirmed) return;
    try {
      await userService.unban(userData?._id || userData?.ipHash);
      if (userData?.isAnonymous) loadAnonymousUsers(); else loadUsers();
      toast.success('✅ Пользователь разбанен!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при разбане', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleBanSubmit = async (banData) => {
    try {
      await userService.ban(selectedUser?._id || selectedUser?.ipHash, banData);
      if (selectedUser?.isAnonymous) loadAnonymousUsers(); else loadUsers();
      setShowBanModal(false);
      toast.success('🔨 Пользователь забанен!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при бане', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleUnban = async (userId) => {
    try {
      await userService.unban(userId);
      if (selectedUser?.isAnonymous) loadAnonymousUsers(); else loadUsers();
      setShowBanModal(false);
      toast.success('✅ Пользователь разбанен!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userService.update(userId, { role: newRole });
      loadUsers();
      toast.success('✅ Роль изменена!', {
        position: 'top-right',
        autoClose: 2500,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при смене роли', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  // Обработчики для управления бордами
  const handleCreateBoard = async (e) => {
    e.preventDefault();
    try {
      if (editingBoard) {
        await boardService.update(editingBoard._id, {
          name: boardFormData.name,
          description: boardFormData.description,
        });
        toast.success('✅ Борд обновлён!', {
          position: 'top-right',
          autoClose: 3000,
        });
      } else {
        await boardService.create(boardFormData);
        toast.success('✅ Борд создан!', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
      
      setBoardFormData({ name: '', code: '', description: '' });
      setShowCreateBoard(false);
      setEditingBoard(null);
      loadBoards();
      loadStats();
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleDeleteBoard = async (boardId) => {
    const confirmed = window.confirm('Удалить этот борд? Это действие нельзя отменить!');
    if (!confirmed) return;
    try {
      await boardService.delete(boardId);
      loadBoards();
      loadStats();
      toast.success('🗑️ Борд удалён!', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Ошибка при удалении борда', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
  };

  const handleEditBoard = (board) => {
    setEditingBoard(board);
    setBoardFormData({
      name: board.name || '',
      code: board.code || '',
      description: board.description || '',
    });
    setShowCreateBoard(true);
  };

  const handleCancelEdit = () => {
    setEditingBoard(null);
    setBoardFormData({ name: '', code: '', description: '' });
  };

  // Форматирование времени до разбана
  const formatBanExpiry = (bannedUntil, isActive) => {
    if (isActive) return '—';
    if (!bannedUntil) return '∞ Перманентно';
    const now = Date.now();
    const expiry = new Date(bannedUntil).getTime();
    const diff = expiry - now;
    if (diff <= 0) return 'Истёк';
    const date = new Date(bannedUntil).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${date} (ост. ${days} дн.)`;
    if (hours > 0) return `${date} (ост. ${hours} ч.)`;
    return `${date} (скоро)`;
  };

  // Проверка роли
  if (user?.role !== 'admin' && user?.role !== 'moderator') {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <h3>Доступ запрещен</h3>
          <p>У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ В ожидании', color: '#ffc107' },
      banned: { text: '🔨 Обработана', color: '#dc3545' },
      rejected: { text: '❌ Отклонена', color: '#6c757d' },
    };
    return badges[status] || badges.pending;
  };

  const getReasonText = (reason) => {
    const reasons = {
      spam: 'Спам / Реклама', offensive: 'Оскорбление', illegal: 'Незаконный контент',
      harassment: 'Преследование', other: 'Другое',
    };
    return reasons[reason] || reason;
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2 className="admin-title">🛠️ Панель модерации</h2>
        
        <div className="admin-header">
          <div className="admin-user-info">
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Администратор' : 'Модератор'}</div>
            </div>
          </div>
        </div>

        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Дашборд</button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            ⚠️ Жалобы {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Пользователи</button>
          <button className={`tab-btn ${activeTab === 'anonymous' ? 'active' : ''}`} onClick={() => setActiveTab('anonymous')}>👤 Анонимы</button>
          <button className={`tab-btn ${activeTab === 'boards' ? 'active' : ''}`} onClick={() => setActiveTab('boards')}>📋 Борды</button>
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              <h3>Статистика</h3>
              {statsLoading ? (
                <div className="loader"></div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-number">{stats.boardsCount ?? 0}</div><div className="stat-label">Бордов</div></div>
                  <div className="stat-card"><div className="stat-number">{stats.threadsCount ?? 0}</div><div className="stat-label">Тредов</div></div>
                  <div className="stat-card"><div className="stat-number">{stats.pendingReports ?? 0}</div><div className="stat-label">Новых жалоб</div></div>
                </div>
              )}
              <div className="quick-actions">
                <h4>Быстрые действия</h4>
                <div className="actions-grid">
                  <button className="action-btn" onClick={() => setActiveTab('boards')}><span className="action-icon">📋</span><span>Управление бордами</span></button>
                  <button className="action-btn" onClick={() => { setActiveTab('reports'); setReportFilter('pending'); }}><span className="action-icon">⚠️</span><span>Проверить жалобы</span></button>
                  <button className="action-btn" onClick={() => setActiveTab('users')}><span className="action-icon">👥</span><span>Управление пользователями</span></button>
                  <button className="action-btn" onClick={() => setActiveTab('anonymous')}><span className="action-icon">👤</span><span>Анонимы</span></button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-management">
              <div className="reports-header">
                <h3>⚠️ Система жалоб</h3>
                <div className="filter-buttons">
                  <button className={`filter-btn ${reportFilter === 'pending' ? 'active' : ''}`} onClick={() => setReportFilter('pending')}>В ожидании ({(reports || []).filter(r => r?.status === 'pending').length})</button>
                  <button className={`filter-btn ${reportFilter === 'banned' ? 'active' : ''}`} onClick={() => setReportFilter('banned')}>Обработанные</button>
                  <button className={`filter-btn ${reportFilter === 'rejected' ? 'active' : ''}`} onClick={() => setReportFilter('rejected')}>Отклоненные</button>
                  <button className={`filter-btn ${reportFilter === '' ? 'active' : ''}`} onClick={() => setReportFilter('')}>Все</button>
                </div>
              </div>
              {reportsLoading ? <div className="loader"></div> : !reports || reports.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📭</div><h3>Нет жалоб</h3><p>Все жалобы рассмотрены или их пока нет</p></div>
              ) : (
                <div className="reports-list">
                  {(reports || []).map((report) => {
                    if (!report) return null;
                    const badge = getStatusBadge(report.status);
                    return (
                      <div key={report._id} className="report-card">
                        <div className="report-header">
                          <div className="report-badge" style={{ backgroundColor: badge.color }}>{badge.text}</div>
                          <span className="report-date">{new Date(report.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        <div className="report-content">
                          <div className="report-info"><strong>Пост:</strong><div className="post-preview"><p>{report.post?.content?.substring(0, 100) || '...'}...</p><small>Автор: {report.post?.author || 'Аноним'}</small></div></div>
                          <div className="report-info"><strong>Жалоба от:</strong><span>{report.user?.username || 'Неизвестно'}</span></div>
                          <div className="report-info"><strong>Причина:</strong><span>{getReasonText(report.reason)}</span></div>
                          {report.description && <div className="report-info"><strong>Описание:</strong><p>{report.description}</p></div>}
                          {report.status !== 'pending' && (
                            <><div className="report-info"><strong>Статус:</strong><span>{report.status === 'banned' ? '✅ Одобрена' : '❌ Отклонена'}</span></div>
                            {report.moderatorNotes && <div className="report-info"><strong>Заметки модератора:</strong><p>{report.moderatorNotes}</p></div>}
                            {report.bannedBy && <div className="report-info"><strong>Обработал:</strong><span>{report.bannedBy.username}</span></div>}
                            {report.bannedAt && <div className="report-info"><strong>Дата обработки:</strong><span>{new Date(report.bannedAt).toLocaleString('ru-RU')}</span></div>}</>
                          )}
                        </div>
                        {report.status === 'pending' && (
                          <div className="report-actions">
                            <button className="btn btn-approve" onClick={() => handleApprove(report._id)}>✅ Одобрить (удалить пост)</button>
                            <button className="btn btn-reject" onClick={() => handleReject(report._id)}>❌ Отклонить</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-management">
              <div className="users-header">
                <h3>👥 Управление пользователями</h3>
                <div className="users-controls">
                  <input type="text" placeholder="Поиск по имени/email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="search-input" />
                  <select value={userSort} onChange={(e) => setUserSort(e.target.value)} className="sort-select">
                    <option value="reports">Сортировать: по жалобам ↓</option>
                    <option value="name">Сортировать: по имени</option>
                    <option value="date">Сортировать: по дате</option>
                  </select>
                </div>
              </div>
              {usersLoading ? <div className="loader"></div> : !users || users.length === 0 ? (
                <div className="empty-state"><p>📭 Пользователи не найдены</p></div>
              ) : (
                <>
                  <table className="users-table">
                    <thead><tr>
                      <th onClick={() => setUserSort('reports')} style={{ cursor: 'pointer' }}>Жалобы {userSort === 'reports' ? '▼' : ''}</th>
                      <th>Пользователь</th><th>Роль</th><th>Статус бана</th><th>Действия</th>
                    </tr></thead>
                    <tbody>
                      {(users || []).map((u) => {
                        if (!u) return null;
                        const hasReports = u.reportsCount > 0;
                        const hasPendingReports = u.pendingReportsCount > 0;
                        const isBanned = !u.isActive;
                        return (
                          <tr key={u._id} className={isBanned ? 'banned-row' : ''}>
                            <td><span className={`badge ${hasPendingReports ? 'badge-warning' : 'badge-secondary'}`}>{u.reportsCount || 0}</span></td>
                            <td><div><strong>{u.username || 'Неизвестно'}</strong></div><small className="text-muted">{u.email || ''}</small></td>
                            <td><select value={u.role || 'user'} onChange={(e) => handleRoleChange(u._id, e.target.value)} className="role-select">
                              <option value="user">Пользователь</option><option value="moderator">Модератор</option><option value="admin">Админ</option>
                            </select></td>
                            <td>{isBanned ? (<div className="ban-status-cell"><span className="status-banned">🔒 Забанен</span><span className="ban-expiry">{formatBanExpiry(u.bannedUntil, u.isActive)}</span></div>) : (<span className="status-active">✅ Активен</span>)}</td>
                            <td><div className="action-buttons">
                              <button className={`btn btn-sm ${hasReports ? 'btn-outline-primary' : 'btn-secondary'}`} onClick={() => handleViewReports(u)} disabled={!hasReports}>📋 {hasReports ? 'Жалобы' : 'Нет жалоб'}</button>
                              {isBanned ? (<button className="btn btn-sm btn-success" onClick={() => handleQuickUnban(u)}>✅ Разбанить</button>) : (<button className="btn btn-sm btn-danger" onClick={() => handleBanClick(u)}>🔨 Забанить</button>)}
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {userTotalPages > 1 && (
                    <div className="pagination">
                      <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)}>← Назад</button>
                      <span>Стр. {userPage} из {userTotalPages}</span>
                      <button disabled={userPage === userTotalPages} onClick={() => setUserPage(p => p + 1)}>Вперёд →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'anonymous' && (
            <div className="users-management">
              <div className="users-header"><h3>👤 Анонимные пользователи (по IP)</h3></div>
              {usersLoading ? <div className="loader"></div> : !anonymousUsers || anonymousUsers.length === 0 ? (
                <div className="empty-state"><p>📭 Анонимные пользователи не найдены</p></div>
              ) : (
                <>
                  <table className="users-table">
                    <thead><tr><th>IP Hash</th><th>Постов</th><th>Жалобы</th><th>Последняя активность</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {(anonymousUsers || []).map((anon) => {
                        if (!anon) return null;
                        const hasReports = anon.reportsCount > 0;
                        const hasPendingReports = anon.pendingReportsCount > 0;
                        const isBanned = anon.isBanned;
                        return (
                          <tr key={anon.ipHash} className={isBanned ? 'banned-row' : ''}>
                            <td><code>#{anon.ipHash || 'N/A'}</code></td>
                            <td>{anon.postCount || 0}</td>
                            <td><span className={`badge ${hasPendingReports ? 'badge-warning' : 'badge-secondary'}`}>{anon.reportsCount || 0}</span></td>
                            <td>{anon.lastActivity ? new Date(anon.lastActivity).toLocaleString('ru-RU') : '—'}</td>
                            <td>{isBanned ? (<span className="status-banned">🔒 Забанен</span>) : (<span className="status-active">✅ Активен</span>)}</td>
                            <td><div className="action-buttons">
                              <button className={`btn btn-sm ${hasReports ? 'btn-outline-primary' : 'btn-secondary'}`} onClick={() => handleViewReports(anon)} disabled={!hasReports}>📋 {hasReports ? 'Жалобы' : 'Нет жалоб'}</button>
                              {isBanned ? (<button className="btn btn-sm btn-success" onClick={() => handleQuickUnban(anon)}>✅ Разбанить</button>) : (<button className="btn btn-sm btn-danger" onClick={() => handleBanClick({ ...anon, _id: anon.ipHash, isActive: !isBanned })}>🔨 Забанить IP</button>)}
                            </div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {anonTotalPages > 1 && (
                    <div className="pagination">
                      <button disabled={anonPage === 1} onClick={() => setAnonPage(p => p - 1)}>← Назад</button>
                      <span>Стр. {anonPage} из {anonTotalPages}</span>
                      <button disabled={anonPage === anonTotalPages} onClick={() => setAnonPage(p => p + 1)}>Вперёд →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'boards' && (
            <div className="boards-management">
              <div className="boards-header">
                <h3>📋 Управление бордами</h3>
                <button className="btn btn-primary" onClick={() => { setShowCreateBoard(!showCreateBoard); setEditingBoard(null); setBoardFormData({ name: '', code: '', description: '' }); }}>
                  {showCreateBoard ? '✕ Отмена' : '➕ Добавить борд'}
                </button>
              </div>

              {/* 🔹 ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ БОРДА */}
              {showCreateBoard && (
                <div className="board-form-card">
                  <div className="board-form-header">
                    <h4>{editingBoard ? '✏️ Редактировать борд' : '➕ Создать новый борд'}</h4>
                    <button className="btn-close" onClick={handleCancelEdit}>×</button>
                  </div>
                  <form onSubmit={handleCreateBoard} className="board-form">
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="board-code">Код борда <span className="required">*</span></label>
                        <input
                          id="board-code"
                          type="text"
                          value={boardFormData.code}
                          onChange={(e) => setBoardFormData({...boardFormData, code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                          placeholder="Например: b"
                          required
                          disabled={!!editingBoard}  // 🔴 Код нельзя изменить при редактировании
                          maxLength={10}
                          className="form-input"
                        />
                        <small className="form-hint">Только латинские буквы и цифры, без пробелов</small>
                      </div>
                      <div className="form-field">
                        <label htmlFor="board-name">Название <span className="required">*</span></label>
                        <input
                          id="board-name"
                          type="text"
                          value={boardFormData.name}
                          onChange={(e) => setBoardFormData({...boardFormData, name: e.target.value})}
                          placeholder="Например: Случайное"
                          required
                          maxLength={50}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-field">
                      <label htmlFor="board-desc">Описание</label>
                      <textarea
                        id="board-desc"
                        value={boardFormData.description}
                        onChange={(e) => setBoardFormData({...boardFormData, description: e.target.value})}
                        placeholder="Краткое описание тематики борда..."
                        rows="3"
                        maxLength={200}
                        className="form-textarea"
                      />
                      <small className="form-hint">Максимум 200 символов</small>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Отмена</button>
                      <button type="submit" className="btn btn-primary">
                        {editingBoard ? '💾 Сохранить изменения' : '✅ Создать борд'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 🔹 СПИСОК БОРДОВ */}
              {boardsLoading ? (
                <div className="loader"></div>
              ) : !boards || boards.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h4>Борды не найдены</h4>
                  <p>Создайте первый борд, нажав кнопку выше</p>
                </div>
              ) : (
                <div className="boards-grid">
                  {(boards || []).map((board) => {
                    if (!board) return null;
                    return (
                      <div key={board._id} className="board-card">
                        <div className="board-card-header">
                          <div className="board-code">/{board.code || 'N/A'}/</div>
                          <div className="board-actions-mini">
                            {/* 🔴 КНОПКА РЕДАКТИРОВАНИЯ */}
                            <button 
                              className="btn-icon btn-edit" 
                              onClick={() => {
                                handleEditBoard(board);
                                setShowCreateBoard(true);  // 🔴 Показываем форму
                              }} 
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-icon btn-delete" 
                              onClick={() => handleDeleteBoard(board._id)} 
                              title="Удалить"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h4 className="board-name">{board.name || 'Без названия'}</h4>
                        {board.description && <p className="board-description">{board.description}</p>}
                        <div className="board-stats">
                          <span className="stat-item">📌 {board.threadCount ?? board.threadsCount ?? 0} тредов</span>
                        </div>
                        <div className="board-meta">
                          <small>Создан: {board.createdAt ? new Date(board.createdAt).toLocaleDateString('ru-RU') : '—'}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      {showBanModal && selectedUser && (
        <BanModal user={selectedUser} onClose={() => setShowBanModal(false)} onBan={handleBanSubmit} onUnban={handleUnban} />
      )}
      {showReportsModal && selectedUser && (
        <ReportsModal user={selectedUser} onClose={() => setShowReportsModal(false)} />
      )}
    </div>
  );
};

export default AdminPage;