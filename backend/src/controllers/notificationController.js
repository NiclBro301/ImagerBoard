const Notification = require('../models/Notification');

// @desc    Получить уведомления текущего пользователя
// @route   GET /api/auth/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('fromUser', 'username')
      .populate('post', 'content author')
      .populate('thread', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit)
      .lean();

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении уведомлений',
      error: error.message,
    });
  }
};

// @desc    Пометить уведомление как прочитанное
// @route   PATCH /api/auth/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Уведомление не найдено' });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Уведомление прочитано',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при пометке уведомления',
      error: error.message,
    });
  }
};

// @desc    Пометить все уведомления как прочитанные
// @route   PATCH /api/auth/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Все уведомления прочитаны',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при пометке уведомлений',
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};