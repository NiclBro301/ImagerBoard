const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ban = require('../models/Ban');  // 🔴 Импортируем модель Ban
const crypto = require('crypto');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // 🔴 ПРОВЕРКА IP-БАНА для анонимов
    const ipHash = crypto.createHash('sha256')
      .update(`${req.ip}|${req.headers['user-agent']}`)
      .digest('hex')
      .slice(0, 16);
    
    const ipBan = await Ban.findOne({
      ipAddress: ipHash,
      isActive: true,
      $or: [
        { bannedUntil: null },  // Перманентный бан
        { bannedUntil: { $gt: Date.now() } }  // Временный бан ещё действует
      ]
    });

    if (ipBan) {
      return res.status(403).json({
        success: false,
        message: 'Ваш IP-адрес забанен',
        bannedUntil: ipBan.bannedUntil,
        isPermanent: !ipBan.bannedUntil,
      });
    }

    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      req.user = null;
      return next();
    }

    // Проверка бана пользователя
    if (req.user.isBanned()) {
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт забанен',
        bannedUntil: req.user.bannedUntil,
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Ваш аккаунт деактивирован',
      });
    }

    next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🔍 authorize: req.user.role =', req.user?.role, 'required =', roles);
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `У вас нет прав для выполнения этого действия. Требуемая роль: ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };