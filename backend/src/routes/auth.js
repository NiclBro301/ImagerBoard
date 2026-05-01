const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const authController = require('../controllers/authController');

// Публичные роуты
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);

// Защищённые роуты
router.get('/me', protect, authController.getMe);
router.get('/me/stats', protect, authController.getUserStats);

// 🔴 Уведомления
router.get('/notifications', protect, authController.getNotifications);
router.patch('/notifications/:id/read', protect, authController.markNotificationAsRead);
router.delete('/notifications/:id', protect, authController.deleteNotification);

// 🔴 Аватар
router.post('/avatar', protect, upload.single('avatar'), authController.uploadAvatar);
router.delete('/avatar', protect, authController.deleteAvatar);

// 🔴 Удаление всех уведомлений
router.delete('/notifications/all', protect, authController.deleteAllNotifications);

module.exports = router;