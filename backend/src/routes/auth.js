const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  getUserStats,
} = require('../controllers/authController');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,  // 🔴 Импортируем функцию
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require('../middleware/validation');

// Публичные роуты
router.post(
  '/register',
  validateRegister,
  handleValidationErrors,
  register
);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/logout', protect, logout);

// Защищённые роуты
router.get('/me', protect, getMe);
router.get('/me/stats', protect, getUserStats);

// 🔴 Роуты для уведомлений
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllAsRead);
router.delete('/notifications/:id', protect, deleteNotification);  // ← Используем импортированную функцию

module.exports = router;