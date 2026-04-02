const Ban = require('../models/Ban');
const User = require('../models/User');

// @desc    Создать бан
// @route   POST /api/bans
// @access  Private/Admin/Moderator
const createBan = async (req, res) => {
  try {
    const { userId, ipAddress, reason, description, type, duration } = req.body;

    // Проверяем, что указан хотя бы один из параметров
    if (!userId && !ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать пользователя или IP адрес',
      });
    }

    // Проверяем, не забанен ли пользователь уже
    const existingBan = await Ban.findOne({
      $or: [
        { userId, isActive: true },
        { ipAddress, isActive: true },
      ],
    });

    if (existingBan && existingBan.isCurrentlyActive()) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь или IP уже забанены',
      });
    }

    // Определяем время окончания бана
    let bannedUntil = null;
    if (type === 'temporary' && duration) {
      bannedUntil = new Date(Date.now() + duration);
    }

    // Создаём бан
    const ban = await Ban.create({
      userId,
      ipAddress,
      reason,
      description,
      type,
      bannedUntil,
      bannedBy: req.user._id,
    });

    // Если бан пользователя, обновляем его статус
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.bannedUntil = bannedUntil;
        await user.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно забанен',
       ban,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании бана',
      error: error.message,
    });
  }
};

// @desc    Получить все баны
// @route   GET /api/bans
// @access  Private/Admin/Moderator
const getBans = async (req, res) => {
  try {
    const { active, userId, page = 1, limit = 20 } = req.query;

    // Фильтр
    const filter = {};
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }
    if (userId) {
      filter.userId = userId;
    }

    const bans = await Ban.find(filter)
      .populate('userId', 'username email')
      .populate('bannedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Ban.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bans.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
       bans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении банов',
      error: error.message,
    });
  }
};

// @desc    Получить бан по ID
// @route   GET /api/bans/:id
// @access  Private/Admin/Moderator
const getBanById = async (req, res) => {
  try {
    const ban = await Ban.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('bannedBy', 'username')
      .lean();

    if (!ban) {
      return res.status(404).json({
        success: false,
        message: 'Бан не найден',
      });
    }

    res.status(200).json({
      success: true,
       ban,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении бана',
      error: error.message,
    });
  }
};

// @desc    Разбанить пользователя
// @route   PATCH /api/bans/:id/unban
// @access  Private/Admin/Moderator
const unban = async (req, res) => {
  try {
    const ban = await Ban.findById(req.params.id);

    if (!ban) {
      return res.status(404).json({
        success: false,
        message: 'Бан не найден',
      });
    }

    if (!ban.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже разбанен',
      });
    }

    await ban.unban(req.user._id);

    // Обновляем статус пользователя
    if (ban.userId) {
      const user = await User.findById(ban.userId);
      if (user) {
        user.bannedUntil = null;
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Пользователь разбанен',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при разбане',
      error: error.message,
    });
  }
};

// @desc    Продлить бан
// @route   PATCH /api/bans/:id/extend
// @access  Private/Admin/Moderator
const extendBan = async (req, res) => {
  try {
    const { additionalTime } = req.body;
    const ban = await Ban.findById(req.params.id);

    if (!ban) {
      return res.status(404).json({
        success: false,
        message: 'Бан не найден',
      });
    }

    if (!ban.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя продлить неактивный бан',
      });
    }

    await ban.extendBan(additionalTime);

    res.status(200).json({
      success: true,
      message: 'Бан продлён',
       ban,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при продлении бана',
      error: error.message,
    });
  }
};

// @desc    Проверить, забанен ли пользователь
// @route   GET /api/bans/check
// @access  Public
const checkBan = async (req, res) => {
  try {
    const { userId, ipAddress } = req.query;

    const filter = { isActive: true };
    if (userId) {
      filter.userId = userId;
    }
    if (ipAddress) {
      filter.ipAddress = ipAddress;
    }

    const ban = await Ban.findOne(filter);

    if (!ban || !ban.isCurrentlyActive()) {
      return res.status(200).json({
        success: true,
        isBanned: false,
      });
    }

    res.status(200).json({
      success: true,
      isBanned: true,
      ban: {
        reason: ban.reason,
        bannedUntil: ban.bannedUntil,
        description: ban.description,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при проверке бана',
      error: error.message,
    });
  }
};

module.exports = {
  createBan,
  getBans,
  getBanById,
  unban,
  extendBan,
  checkBan,
};