const User = require('../models/User');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// @desc    Регистрация нового пользователя
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Пожалуйста, заполните все поля',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует',
      });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: 'Пользователь зарегистрирован',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Пожалуйста, введите email и пароль',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль',
      });
    }

    if (user.isBanned()) {
      return res.status(403).json({
        success: false,
        message: user.bannedUntil 
          ? `Ваш аккаунт заблокирован до ${new Date(user.bannedUntil).toLocaleString('ru-RU')}`
          : 'Ваш аккаунт заблокирован навсегда',
        bannedUntil: user.bannedUntil,
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Вход выполнен успешно',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе',
      error: error.message,
    });
  }
};

// @desc    Выход из системы
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Выход выполнен',
  });
};

// @desc    Получить текущего пользователя
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных пользователя',
      error: error.message,
    });
  }
};

// @desc    Получить статистику текущего пользователя
// @route   GET /api/auth/me/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const Post = require('../models/Post');
    const Thread = require('../models/Thread');
    const Report = require('../models/Report');
    
    const postsCount = await Post.countDocuments({ user: userId, isDeleted: false });
    const threadsCount = await Thread.countDocuments({ user: userId, isDeleted: false });
    
    const likesData = await Post.aggregate([
      { $match: { user: userId, isDeleted: false } },
      { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
    ]);
    const likesReceived = likesData[0]?.totalLikes || 0;
    
    const reportsCount = await Report.countDocuments({ 'post.user': userId });
    const reportsSubmitted = await Report.countDocuments({ reportedBy: userId });

    res.status(200).json({
      success: true,
      stats: {
        posts: postsCount,
        threads: threadsCount,
        likesReceived,
        reportsReceived: reportsCount,
        reportsSubmitted,
        memberSince: req.user.createdAt,
        lastActive: req.user.lastLogin || req.user.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 🔴 НОВЫЕ: ФУНКЦИИ УВЕДОМЛЕНИЙ

// @desc    Получить уведомления пользователя
// @route   GET /auth/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { unreadOnly = false, limit = 10, page = 1 } = req.query;
    
    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('fromUser', 'username')
      .populate('post', 'content author')
      .lean();
    
    const total = await Notification.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      notifications,
    });
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении уведомлений',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Отметить уведомление как прочитанное
// @route   PATCH /auth/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Уведомление не найдено',
      });
    }
    
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      message: 'Уведомление отмечено как прочитанное',
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отметке уведомления',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Удалить уведомление
// @route   DELETE /auth/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Уведомление не найдено',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Уведомление удалено',
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении уведомления',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 🔴 НОВЫЕ: ФУНКЦИИ АВАТАРА

// @desc    Загрузить аватар пользователя
// @route   POST /auth/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не загружен',
      });
    }

    console.log('📁 Uploaded file:', req.file.filename);

    const processedImagePath = path.join(
      __dirname,
      '../../uploads/avatars',
      `avatar-${req.user._id}-${Date.now()}.jpg`
    );

    await sharp(req.file.path)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toFile(processedImagePath);

    console.log('✅ Processed avatar:', processedImagePath);

    fs.unlinkSync(req.file.path);

    const user = await User.findById(req.user._id);
    
    if (user.avatar && fs.existsSync(path.join(__dirname, '../../', user.avatar))) {
      fs.unlinkSync(path.join(__dirname, '../../', user.avatar));
      console.log('🗑️ Deleted old avatar:', user.avatar);
    }
    
    user.avatar = `/uploads/avatars/${path.basename(processedImagePath)}`;
    await user.save();

    console.log('✅ Avatar saved to database:', user.avatar);

    res.status(200).json({
      success: true,
      message: 'Аватар загружен',
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('❌ Error uploading avatar:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке аватара',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Удалить аватар пользователя
// @route   DELETE /auth/avatar
// @access  Private
const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.avatar && fs.existsSync(path.join(__dirname, '../../', user.avatar))) {
      fs.unlinkSync(path.join(__dirname, '../../', user.avatar));
      console.log('🗑️ Deleted avatar:', user.avatar);
    }
    
    user.avatar = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Аватар удалён',
    });
  } catch (error) {
    console.error('❌ Error deleting avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении аватара',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Удалить все уведомления пользователя
// @route   DELETE /auth/notifications/all
// @access  Private
const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Все уведомления удалены',
    });
  } catch (error) {
    console.error('❌ Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении уведомлений',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  getUserStats,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  uploadAvatar,
  deleteAvatar,
  deleteAllNotifications,
};