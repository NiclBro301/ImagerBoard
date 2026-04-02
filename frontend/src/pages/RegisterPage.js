import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { toast } from 'react-toastify'; 
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { username, email, password, confirmPassword } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  if (password !== confirmPassword) {
    toast.error('❌ Пароли не совпадают', {
      position: 'top-right',
      autoClose: 3000,
    });
    setLoading(false);
    return;
  }

  if (password.length < 6) {
    toast.error('❌ Пароль должен быть не менее 6 символов', {
      position: 'top-right',
      autoClose: 3000,
    });
    setLoading(false);
    return;
  }

  try {
    await authService.register({
      username,
      email,
      password,
    });
    
    toast.success('✅ Регистрация успешна! Теперь войдите в систему', {
      position: 'top-right',
      autoClose: 3000,
    });
    
    navigate('/login', { 
      state: { message: 'Регистрация успешна! Теперь войдите в систему.' } 
    });
  } catch (err) {
    toast.error(err.response?.data?.message || '❌ Ошибка при регистрации', {
      position: 'top-right',
      autoClose: 4000,
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="text-center mb-4">Регистрация</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={username}
              onChange={handleChange}
              required
              placeholder="Введите имя пользователя"
              minLength="3"
              maxLength="30"
            />
          </div>

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
              placeholder="Введите пароль (минимум 6 символов)"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              value={confirmPassword}
              onChange={handleChange}
              required
              placeholder="Повторите пароль"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="text-center mt-3">
          <p>
            Уже есть аккаунт?{' '}
            <Link to="/login" className="link">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;