const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Генерация JWT токена
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Регистрация пользователя
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Проверяем, существует ли пользователь с таким email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    // Создаем нового пользователя
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'user',
    });

    // Генерируем токен
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Регистрация успешна',
      token,
      user: user.getPublicData(),
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации',
      error: error.message,
    });
  }
};

// @desc    Вход в систему
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Проверяем, существует ли пользователь
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    // Проверяем пароль
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    // Проверяем, не забанен ли пользователь
    if (user.isBanned()) {
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт забанен',
      });
    }

    // Проверяем, активен ли пользователь
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт деактивирован',
      });
    }

    // Обновляем время последнего входа
    await user.updateLastLogin();

    // Генерируем токен
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: user.getPublicData(),
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе',
      error: error.message,
    });
  }
};

// @desc    Получить текущего пользователя
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // Пользователь уже добавлен в req.user мидлварой protect
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: user.getPublicData(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных пользователя',
      error: error.message,
    });
  }
};

// @desc    Выход из системы
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Выход выполнен успешно',
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};