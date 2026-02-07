import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout } from './store/authSlice';
import { fetchBoards } from './store/boardsSlice';

import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';

import './App.css';

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
              <Link to="/admin" className="nav-link">
                Админка
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <span className="nav-link">
                  Привет, {user?.username || 'Модератор'}
                </span>
                <button onClick={handleLogout} className="btn btn-outline">
                  Выйти
                </button>
              </>
            ) : (
              <button className="btn btn-primary">Войти</button>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/board/:boardCode" element={<BoardPage />} />
          <Route path="/thread/:threadId" element={<ThreadPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;