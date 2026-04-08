const express = require('express');
const router = express.Router();

const boardRoutes = require('./boards');
const threadRoutes = require('./threads');
const postRoutes = require('./posts');
const reportRoutes = require('./reports');
const banRoutes = require('./bans');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const searchRoutes = require('./search');

// 🔴 Монтируем роуты
router.use('/boards', boardRoutes);      // /boards, /boards/:id, /boards/code/:code
router.use('/boards', threadRoutes);     // /boards/:code/threads, /boards/thread/:id
router.use('/posts', postRoutes);
router.use('/reports', reportRoutes);
router.use('/bans', banRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/search', searchRoutes);

// 🔴 Проверка здоровья
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

module.exports = router;