import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logout } from './store/authSlice';
import { fetchBoards } from './store/boardsSlice';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './services/api';
import { authService } from './services/authService';

import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
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
      // Обновляем каждые 30 секунд
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

  const handleLogout = () => {
    dispatch(logout());
    setIsBanned(false);
    setBanInfo(null);
    setUnreadCount(0);
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
          <nav className="navbar">
            <Link to="/" className="navbar-brand">ImagerBoard</Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Главная</Link>
              
              {isAuthenticated && (
                <>
                  <Link to="/profile" className="nav-link">
                    Профиль
                    {/* 🔴 БЕЙДЖ УВЕДОМЛЕНИЙ */}
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
                  <span className="nav-username">👋 {user?.username || 'Пользователь'}</span>
                  <button onClick={handleLogout} className="btn btn-outline">Выйти</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">Вход</Link>
                  <Link to="/register" className="btn btn-primary">Регистрация</Link>
                </>
              )}
            </div>
          </nav>

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board/:boardCode" element={<BoardPage />} />
            <Route path="/thread/:threadId" element={<ThreadPage />} />
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