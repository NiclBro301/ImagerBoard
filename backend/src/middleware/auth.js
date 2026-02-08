const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Проверка JWT токена
const protect = async (req, res, next) => {
  try {
    let token;

    // Проверяем заголовок Authorization
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Если токен отсутствует
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован. Пожалуйста, войдите в систему.',
      });
    }

    try {
      // Верифицируем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Находим пользователя по ID из токена
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не найден',
        });
      }

      // Проверяем, не забанен ли пользователь
      if (req.user.isBanned()) {
        return res.status(403).json({
          success: false,
          message: 'Ваш аккаунт забанен',
        });
      }

      // Проверяем, активен ли пользователь
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Ваш аккаунт деактивирован',
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Неверный или просроченный токен',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Проверка роли пользователя
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `У вас нет прав для выполнения этого действия. Требуемая роль: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };