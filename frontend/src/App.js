import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logout } from './store/authSlice';
import { fetchBoards } from './store/boardsSlice';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './services/api';
import { authService } from './services/authService';
import { socketService } from './services/socketService';

import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import BanNotification from './components/BanNotification';

import RoleRoute from './components/RoleRoute';
import './App.css';

// Защита маршрутов - только для авторизованных
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Защита маршрутов - только для неавторизованных
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// 🔴 Компонент навигации с поиском
const Navbar = ({ isAuthenticated, user, onLogout, unreadCount }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">ImagerBoard</Link>
      
      {/* 🔴 ПОИСКОВАЯ СТРОКА В ХЭДЕРЕ */}
      <form onSubmit={handleSearch} className="navbar-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск..."
          className="search-input"
          minLength={2}
        />
        <button type="submit" className="btn-search" disabled={searchQuery.length < 2}>
          Найти
        </button>
      </form>

      <div className="nav-links">
        <Link to="/" className="nav-link">Главная</Link>
        
        {isAuthenticated && (
          <>
            <Link to="/profile" className="nav-link">
              Профиль
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </Link>
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <Link to="/admin" className="nav-link">Админка</Link>
            )}
          </>
        )}
        
        {isAuthenticated ? (
          <>
<span className="nav-username" style={{ cursor: 'default' }}>
  👋 {user?.username || 'Пользователь'}
</span>
            <button onClick={onLogout} className="btn btn-outline">Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Вход</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  
  // 🔴 Состояние для уведомлений
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  // 🔴 Загрузка количества непрочитанных уведомлений
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, token]);

  const fetchUnreadCount = async () => {
    try {
      const response = await authService.getNotifications({ unreadOnly: true, limit: 1 });
      setUnreadCount(response.data?.total || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (isAuthenticated && user) {
        setSessionRestored(true);
        return;
      }
      
      if (!token) {
        setSessionRestored(true);
        return;
      }
      
      try {
        const response = await api.get('/auth/me');
        dispatch(setCredentials({
          token,
          user: response.data.user,
        }));
        
        if (response.data.user?.isActive === false) {
          setIsBanned(true);
          setBanInfo({
            bannedUntil: response.data.user.bannedUntil,
            isPermanent: !response.data.user.bannedUntil,
          });
        }
      } catch (error) {
        console.error('❌ Session restore failed:', error);
        dispatch(logout());
      } finally {
        setSessionRestored(true);
      }
    };

    restoreSession();
  }, [dispatch, token, isAuthenticated, user]);

  // 🔴 ПОДКЛЮЧЕНИЕ К SOCKET.IO (исправленный useEffect)
  useEffect(() => {
    if (!isAuthenticated || !token || !user?._id) {
      return;
    }
    
    console.log('🔌 App: Connecting to socket...');
    
    // 🔴 Подключаемся к сокету с передачей роли
    socketService.connect(token, user._id, user.role);
    
    // 🔹 Слушаем новые уведомления (глобально)
    const handleNotification = (data) => {
      console.log('📥 App: Got notification', data);
      
      // 🔴 Обновляем счётчик мгновенно
      setUnreadCount(prev => prev + 1);
      
      // 🔴 Показываем toast с кликом для перехода в профиль
      toast.info(`🔔 ${data.title}`, {
        position: 'top-right',
        autoClose: 5000,
        onClick: () => {
          // Переход в профиль с открытием вкладки уведомлений
          window.location.href = '/profile?tab=notifications';
        },
      });
      
      // 🔴 Если открыт профиль — отправляем событие для обновления списка
      if (window.location.pathname === '/profile') {
        window.dispatchEvent(new CustomEvent('profile-notifications-refresh'));
      }
    };
    
    socketService.on('notification', handleNotification);
    
    // 🔹 Слушаем новые жалобы (для админов/модераторов)
    let handleNewReport = null;
    if (user?.role === 'admin' || user?.role === 'moderator') {
      handleNewReport = (data) => {
        console.log('📥 App: Got new-report EVENT', data);
        
        // 🔴 Обновляем счётчик уведомлений
        setUnreadCount(prev => prev + 1);
        
        toast.warning(`⚠️ Новая жалоба: ${data.report?.reason || 'неизвестно'}`, {
          position: 'top-right',
          autoClose: 6000,
          onClick: () => {
            if (window.location.pathname === '/admin') {
              window.dispatchEvent(new CustomEvent('admin-reports-refresh'));
            } else {
              window.location.href = '/admin?tab=reports&refresh=1';
            }
          },
        });
      };
      socketService.on('new-report', handleNewReport);
      
      socketService.on('report-updated', (data) => {
        console.log('📥 App: Got report-updated', data);
        toast.info(`📋 Жалоба обновлена: ${data.status}`, {
          position: 'top-right',
          autoClose: 3000,
        });
        if (window.location.pathname === '/admin') {
          window.dispatchEvent(new CustomEvent('admin-reports-refresh'));
        }
      });
    }
    
    // 🔹 Очистка ТОЛЬКО при разлогине или смене пользователя
    return () => {
      console.log('🧹 App: Removing socket listeners');
      socketService.off('notification', handleNotification);
      if (handleNewReport) {
        socketService.off('new-report', handleNewReport);
        socketService.off('report-updated');
      }
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, user?._id, user?.role]);

  // 🔴 Слушаем событие уменьшения счётчика уведомлений
useEffect(() => {
  const handleDecrement = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  window.addEventListener('unread-count-decrement', handleDecrement);
  
  return () => {
    window.removeEventListener('unread-count-decrement', handleDecrement);
  };
}, []);

// 🔴 Слушаем событие сброса счётчика уведомлений
useEffect(() => {
  const handleReset = () => {
    setUnreadCount(0);
  };
  
  window.addEventListener('unread-count-reset', handleReset);
  
  return () => {
    window.removeEventListener('unread-count-reset', handleReset);
  };
}, []);

  const handleLogout = () => {
    dispatch(logout());
    setIsBanned(false);
    setBanInfo(null);
    setUnreadCount(0);
    socketService.disconnect();  // 🔴 Отключаем сокет при выходе
  };

  if (!sessionRestored) {
    return (
      <>
        <div className="App">
          <div className="loader-container">
            <div className="loader"></div>
            <p>Загрузка...</p>
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </>
    );
  }

  if (isBanned && banInfo) {
    return (
      <>
        <BanNotification bannedUntil={banInfo.bannedUntil} isPermanent={banInfo.isPermanent} onLogout={handleLogout} />
        <ToastContainer position="top-right" autoClose={3000} />
      </>
    );
  }

  return (
    <>
      <Router>
        <div className="App">
          {/* 🔴 НАВИГАЦИЯ С ПОИСКОМ */}
          <Navbar 
            isAuthenticated={isAuthenticated} 
            user={user} 
            onLogout={handleLogout}
            unreadCount={unreadCount}
          />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board/:boardCode" element={<BoardPage />} />
            <Route path="/thread/:threadId" element={<ThreadPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<RoleRoute allowedRoles={['admin', 'moderator']}><AdminPage /></RoleRoute>} />
          </Routes>
        </div>
      </Router>
      
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={true} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </>
  );
};

export default App;