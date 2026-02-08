const app = require('./server');

const PORT = process.env.PORT || 3000;

// Запускаем сервер
const server = app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API доступно по адресу: http://localhost:${PORT}/api`);
});

// Обработчик ошибок при запуске сервера
process.on('unhandledRejection', (err) => {
  console.error('❌ Необработанная ошибка:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM получен, завершение работы...');
  server.close(() => {
    console.log('Процесс завершен');
    process.exit(0);
  });
});