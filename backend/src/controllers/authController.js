const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Генерация JWT токена
const generateToken = (userId, userRole) => {
  return jwt.sign(
    { 
      id: userId,
      role: userRole  // 🔴 ДОБАВЛЕНО: роль в токене
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @desc    Регистрация нового пользователя
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email или именем уже существует',
      });
    }

    // Создаём пользователя
    const user = await User.create({
      username,
      email,
      password,
    });

    // Генерируем токен
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: user.getPublicData(),
      token,
    });
  } catch (error) {
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

    // Проверяем наличие email и пароля
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Введите email и пароль',
      });
    }

    // Находим пользователя
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    // Проверяем пароль
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    // 🔴 ПРОВЕРКА БАНА
    if (user.isBanned()) {
      console.log('🔒 Пользователь забанен:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт забанен',
        bannedUntil: user.bannedUntil,
        isPermanent: !user.bannedUntil,
      });
    }

    // Обновляем время последнего входа
    await user.updateLastLogin();

    // Генерируем токен
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Вход выполнен успешно',
      user: user.getPublicData(),
      token,
    });
  } catch (error) {
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
    console.log('🔍 getMe: req.user =', req.user);
    
    // 🔴 ИСПРАВЛЕНО: проверяем req.user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не авторизован',
      });
    }

    // Находим пользователя в базе (чтобы получить актуальные данные)
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,  // 🔴 Явно возвращаем роль
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        bannedUntil: user.bannedUntil,
      },
    });
  } catch (error) {
    console.error('❌ getMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных пользователя',
      error: error.message,
    });
  }
};

// @desc    Выход из системы
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Выход выполнен успешно',
  });
};

// @desc    Получить статистику пользователя
// @route   GET /api/auth/me/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    const userId = req.user._id;

    // Параллельные запросы для статистики
    const [threadsCount, postsCount, likesReceived, notifications] = await Promise.all([
      // Количество созданных тредов
      Thread.countDocuments({ user: userId }),
      
      // Количество оставленных постов
      Post.countDocuments({ user: userId, isDeleted: false }),
      
      // Количество полученных лайков (агрегация)
      Post.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$likes' } } }
      ]),
      
      // Непрочитанные уведомления
      Notification.countDocuments({ user: userId, isRead: false })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        threadsCount: threadsCount || 0,
        postsCount: postsCount || 0,
        likesReceived: likesReceived[0]?.total || 0,
        unreadNotifications: notifications || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка при получении статистики', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  getUserStats,
};