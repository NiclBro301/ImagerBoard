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
} = require('../controllers/notificationController');  // 🔴 ДОБАВЛЕНО
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/me/stats', protect, getUserStats);

// 🔴 ДОБАВЛЕНО: роуты для уведомлений
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/:id/read', protect, markAsRead);
router.patch('/notifications/read-all', protect, markAllAsRead);

module.exports = router;