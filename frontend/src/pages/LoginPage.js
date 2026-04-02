import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';
import './LoginPage.css';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setBanInfo(null);
  setLoading(true);

  try {
    const response = await authService.login({ email, password });
    
    dispatch(setCredentials({
      user: response.data.user,
      token: response.data.token,
    }));
    
    toast.success('🎉 Добро пожаловать, ' + response.data.user.username + '!', {
      position: 'top-right',
      autoClose: 3000,
    });
    
    navigate('/');
  } catch (err) {
    console.error('Ошибка входа:', err);
    
    if (err.response?.status === 403 && err.response?.data?.message === 'Ваш аккаунт забанен') {
      setBanInfo({
        bannedUntil: err.response.data.bannedUntil,
        isPermanent: err.response.data.isPermanent,
      });
      toast.error('🚫 Ваш аккаунт забанен', {
        position: 'top-center',
        autoClose: 5000,
      });
    } else {
      toast.error(err.response?.data?.message || '❌ Ошибка при входе', {
        position: 'top-right',
        autoClose: 4000,
      });
    }
    
    setLoading(false);
  }
};

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="text-center mb-4">Вход в систему</h2>
        
        {banInfo && (
          <div className="ban-alert alert alert-danger">
            <div className="ban-icon">🚫</div>
            <h4>Ваш аккаунт забанен</h4>
            <p>
              {banInfo.isPermanent 
                ? 'Ваш аккаунт забанен навсегда за нарушение правил.'
                : `Бан действует до ${new Date(banInfo.bannedUntil).toLocaleString('ru-RU')}`
              }
            </p>
            <p>Обратитесь к администрации для обжалования бана.</p>
          </div>
        )}
        
        {error && !banInfo && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={email}
              onChange={handleChange}
              required
              placeholder="Введите ваш email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={password}
              onChange={handleChange}
              required
              placeholder="Введите пароль"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <div className="text-center mt-3">
          <p>
            Нет аккаунта?{' '}
            <Link to="/register" className="link">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;