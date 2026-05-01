const express = require('express');
const router = express.Router();

// 🔴 Импортируем все роуты
const authRoutes = require('./auth');
const boardRoutes = require('./boards');
const threadRoutes = require('./threads');
const postRoutes = require('./posts');
const reportRoutes = require('./reports');
const userRoutes = require('./users');

// 🔴 Монтируем роуты (ВАЖНО: более специфичные роуты ПЕРЕД общими!)
router.use('/auth', authRoutes);

// 🔴 Треды ДО бордов, чтобы /:code/threads не перехватывался бордами
router.use('/boards', threadRoutes);
router.use('/boards', boardRoutes);

router.use('/posts', postRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);

// 🔴 Тестовый роут для отладки
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API работает!' });
});

module.exports = router;