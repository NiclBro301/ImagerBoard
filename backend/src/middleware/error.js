// Обработчик ошибок для всего приложения
const errorHandler = (err, req, res, next) => {
  // Логируем ошибку в консоль (в продакшене используйте логгер)
  console.error('❌ Ошибка:', err);

  // Определяем статус код и сообщение
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Внутренняя ошибка сервера';

  // Обработка ошибок валидации MongoDB
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(', ');
  }

  // Обработка ошибок дублирования (например, уникальный email)
  if (err.code === 11000) {
    statusCode = 400;
    message = `Дублирование поля: ${Object.keys(err.keyPattern).join(', ')}`;
  }

  // Обработка ошибок кастомных валидаторов
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Неверный формат ID';
  }

  // Отправляем ответ
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;