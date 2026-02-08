const express = require('express');
const router = express.Router();

// Импортируем роуты
const boardRoutes = require('./boards');
const authRoutes = require('./auth');

// Монтируем роуты
router.use('/boards', boardRoutes);
router.use('/auth', authRoutes);

// Роут для проверки работоспособности сервера
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Сервер работает',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;