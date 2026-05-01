const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const { initSocket } = require('./socket');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔴 Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔴 Статические файлы (аватары, посты)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 🔴 Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/imagerboard')
  .then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.error('❌ MongoDB ошибка:', err));

// 🔴 Инициализация Socket.io (ДО роутов!)
const server = http.createServer(app);
initSocket(server);

// 🔴 Монтируем API роуты (ПОСЛЕ инициализации сокета)
app.use('/api', routes);

// 🔴 Обработка 404 для API
app.use('/api/*', (req, res) => {
  console.warn(`⚠️ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Эндпоинт не найден',
    path: req.originalUrl,
  });
});

// 🔴 Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io: ws://localhost:${PORT}`);
  
  // 🔴 Вывод зарегистрированных роутов для отладки
  console.log('\n📋 Зарегистрированные API роуты:');
  app._router.stack.forEach(layer => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  ${methods} ${layer.route.path}`);
    }
  });
});

// 🔴 Обработка ошибок
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

module.exports = { app, server };