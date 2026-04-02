const User = require('../models/User');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Ban = require('../models/Ban');
const crypto = require('crypto');

// @desc    Получить всех пользователей (зарегистрированных)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'reports', search = '' } = req.query;

    // 🔹 Базовый запрос пользователей
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // 🔹 Получаем пользователей с пагинацией
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit)
      .lean();

    // 🔹 Для каждого пользователя считаем жалобы через посты
    const usersWithReports = await Promise.all(
      users.map(async (user) => {
        // Находим ВСЕ посты этого пользователя
        const userPosts = await Post.find({ user: user._id }).select('_id').lean();
        const postIds = userPosts.map(p => p._id);

        if (postIds.length === 0) {
          return {
            ...user,
            reportsCount: 0,
            pendingReportsCount: 0,
          };
        }

        // Считаем ВСЕ жалобы (кроме отклонённых)
        const totalReports = await Report.countDocuments({ 
          post: { $in: postIds },
          status: { $ne: 'rejected' }  // ❌ Не считаем отклонённые
        });

        // Считаем жалобы В ОЖИДАНИИ (для цвета бейджа)
        const pendingReports = await Report.countDocuments({ 
          post: { $in: postIds },
          status: 'pending'
        });

        return {
          ...user,
          reportsCount: totalReports,
          pendingReportsCount: pendingReports,
        };
      })
    );

    // 🔹 Сортировка
    if (sortBy === 'reports') {
      usersWithReports.sort((a, b) => b.reportsCount - a.reportsCount);
    } else if (sortBy === 'name') {
      usersWithReports.sort((a, b) => a.username.localeCompare(b.username));
    }

    res.status(200).json({
      success: true,
      count: usersWithReports.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users: usersWithReports,
    });
  } catch (error) {
    console.error('❌ Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении пользователей',
      error: error.message,
    });
  }
};

// @desc    Получить анонимных пользователей (по IP)
// @route   GET /api/users/anonymous
// @access  Private/Admin
const getAnonymousUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'reports' } = req.query;

    // 🔹 Находим все уникальные IP-хеши из постов
    const anonymousPosts = await Post.aggregate([
      { $match: { user: null, isDeleted: false, ipHash: { $ne: null } } },
      { 
        $group: {
          _id: '$ipHash',
          postCount: { $sum: 1 },
          lastPost: { $max: '$createdAt' },
          firstPost: { $min: '$createdAt' }
        }
      }
    ]);

    // 🔹 Для каждого IP считаем жалобы
    const anonymousUsers = await Promise.all(
      anonymousPosts.map(async (anon) => {
        const posts = await Post.find({ ipHash: anon._id }).select('_id');
        const postIds = posts.map(p => p._id);
        
        const reportsCount = await Report.countDocuments({
          post: { $in: postIds },
          status: { $ne: 'rejected' }
        });

        const pendingReports = await Report.countDocuments({
          post: { $in: postIds },
          status: 'pending'
        });

        // 🔹 Проверяем, забанен ли этот IP
        const ban = await Ban.findOne({
          ipAddress: anon._id,
          isActive: true,
          $or: [
            { bannedUntil: null },
            { bannedUntil: { $gt: Date.now() } }
          ]
        });

        return {
          _id: anon._id,
          isAnonymous: true,
          ipHash: anon._id,
          postCount: anon.postCount,
          lastActivity: anon.lastPost,
          firstActivity: anon.firstPost,
          reportsCount,
          pendingReportsCount: pendingReports,
          isBanned: !!ban,
          bannedUntil: ban?.bannedUntil,
        };
      })
    );

    // 🔹 Сортировка
    if (sortBy === 'reports') {
      anonymousUsers.sort((a, b) => b.reportsCount - a.reportsCount);
    } else if (sortBy === 'date') {
      anonymousUsers.sort((a, b) => b.lastActivity - a.lastActivity);
    } else if (sortBy === 'posts') {
      anonymousUsers.sort((a, b) => b.postCount - a.postCount);
    }

    // 🔹 Пагинация
    const total = anonymousUsers.length;
    const paginatedUsers = anonymousUsers
      .slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      count: paginatedUsers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users: paginatedUsers,
    });
  } catch (error) {
    console.error('❌ Error in getAnonymousUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении анонимных пользователей',
      error: error.message,
    });
  }
};

// @desc    Получить детализацию пользователя + статистика
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    // 🔹 Статистика
    const [postsCount, likesReceived] = await Promise.all([
      Post.countDocuments({ user: user._id }),
      Post.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: null, total: { $sum: '$likes' } } }
      ])
    ]);

    // 🔹 Жалобы
    const userPosts = await Post.find({ user: user._id }).select('_id');
    const postIds = userPosts.map(p => p._id);
    const reportsCount = postIds.length > 0 
      ? await Report.countDocuments({ post: { $in: postIds } })
      : 0;

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        stats: {
          postsCount,
          reportsCount,
          likesReceived: likesReceived[0]?.total || 0
        }
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Обновить роль или никнейм пользователя
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { username, role } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (role && ['user', 'moderator', 'admin'].includes(role)) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.status(200).json({
      success: true,
      message: 'Пользователь обновлён',
      user: user.getPublicData(),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Забанить пользователя или IP
// @route   POST /api/users/:id/ban
// @access  Private/Admin
const banUser = async (req, res) => {
  try {
    const { duration, reason } = req.body;
    const { id } = req.params;

    // 🔹 Проверяем, это пользователь или IP-хеш
    const isIpBan = id.length === 16 && /^[a-f0-9]+$/.test(id);

    if (isIpBan) {
      // 🔹 Бан по IP
      const existingBan = await Ban.findOne({
        ipAddress: id,
        isActive: true,
      });

      if (existingBan) {
        return res.status(400).json({
          success: false,
          message: 'Этот IP уже забанен',
        });
      }

      await Ban.create({
        ipAddress: id,
        reason: reason || 'other',
        type: duration ? 'temporary' : 'permanent',
        bannedUntil: duration ? new Date(Date.now() + parseInt(duration)) : null,
        bannedBy: req.user._id,
        description: reason,
        isActive: true,
      });

      res.status(200).json({
        success: true,
        message: `IP ${id} ${duration ? 'временно' : 'перманентно'} забанен`,
      });
    } else {
      // 🔹 Бан пользователя
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
      }

      user.isActive = false;
      user.bannedUntil = duration ? new Date(Date.now() + parseInt(duration)) : null;
      user.banReason = reason || 'Нарушение правил';
      await user.save();

      await Ban.create({
        userId: user._id,
        reason: reason || 'other',
        type: duration ? 'temporary' : 'permanent',
        bannedUntil: user.bannedUntil,
        bannedBy: req.user._id,
        description: reason,
      });

      res.status(200).json({
        success: true,
        message: `Пользователь ${user.username} забанен`,
        user: user.getPublicData(),
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Разбанить пользователя или IP
// @route   POST /api/users/:id/unban
// @access  Private/Admin
const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔹 Проверяем, это пользователь или IP-хеш
    const isIpBan = id.length === 16 && /^[a-f0-9]+$/.test(id);

    if (isIpBan) {
      // 🔹 Разбан IP
      await Ban.findOneAndUpdate(
        { ipAddress: id, isActive: true },
        { isActive: false, unbannedBy: req.user._id, unbannedAt: Date.now() }
      );

      res.status(200).json({
        success: true,
        message: 'IP разбанен',
      });
    } else {
      // 🔹 Разбан пользователя
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Пользователь не найден' });
      }

      user.isActive = true;
      user.bannedUntil = null;
      user.banReason = null;
      await user.save();

      await Ban.findOneAndUpdate(
        { userId: user._id, isActive: true },
        { isActive: false, unbannedBy: req.user._id, unbannedAt: Date.now() }
      );

      res.status(200).json({
        success: true,
        message: 'Пользователь разбанен',
        user: user.getPublicData(),
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Получить жалобы на пользователя
// @route   GET /api/users/:id/reports
// @access  Private/Admin
const getUserReports = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { id } = req.params;

    // 🔹 Проверяем, это пользователь или IP-хеш
    const isIpHash = id.length === 16 && /^[a-f0-9]+$/.test(id);

    let postIds;
    
    if (isIpHash) {
      // 🔹 Для IP: находим посты по ipHash
      const posts = await Post.find({ ipHash: id }).select('_id');
      postIds = posts.map(p => p._id);
    } else {
      // 🔹 Для пользователя: находим посты по user._id
      const posts = await Post.find({ user: id }).select('_id');
      postIds = posts.map(p => p._id);
    }

    // 🔹 Находим жалобы на эти посты
    const reports = await Report.find({ post: { $in: postIds } })
      .populate('user', 'username')
      .populate('post', 'content author')
      .populate('bannedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Report.countDocuments({ post: { $in: postIds } });

    res.status(200).json({
      success: true,
      count: reports.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      reports,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getAnonymousUsers,
  getUserById,
  updateUser,
  banUser,
  unbanUser,
  getUserReports,
};