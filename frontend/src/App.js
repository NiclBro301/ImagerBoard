import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from './store/authSlice';
import { fetchBoards } from './store/boardsSlice';

import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

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
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            ImagerBoard
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">
              Главная
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/profile" className="nav-link">
                  Профиль
                </Link>
                {(user?.role === 'admin' || user?.role === 'moderator') && (
                  <Link to="/admin" className="nav-link">
                    Админка
                  </Link>
                )}
              </>
            )}
            
            {isAuthenticated ? (
              <>
                <span className="nav-username">
                  👋 {user?.username || 'Пользователь'}
                </span>
                <button onClick={handleLogout} className="btn btn-outline">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Вход
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/board/:boardCode" element={<BoardPage />} />
          <Route path="/thread/:threadId" element={<ThreadPage />} />
          
          {/* Публичные маршруты */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          
          {/* Защищённые маршруты */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <RoleRoute allowedRoles={['admin', 'moderator']}>
                <AdminPage />
              </RoleRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;