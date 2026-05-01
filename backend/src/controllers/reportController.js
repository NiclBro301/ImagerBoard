// backend/src/controllers/reportController.js
const Report = require('../models/Report');
const Post = require('../models/Post');
const User = require('../models/User');
const Ban = require('../models/Ban');

// 🔴 Безопасная функция: Извлекает оригинальный текст из поста
const extractOriginalText = (content) => {
  try {
    if (!content || typeof content !== 'string') return 'Пост удалён';
    
    let cleanContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    const lines = cleanContent.split('\n');
    const originalLines = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('>')) {
        originalLines.push(trimmed);
      }
    }
    
    if (originalLines.length > 0) {
      return originalLines.join(' ').trim();
    }
    
    const quoteLines = [];
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        quoteLines.push(trimmed.replace(/^>\s*/, '').trim());
      }
    }
    
    if (quoteLines.length > 0) {
      return quoteLines[quoteLines.length - 1];
    }
    
    return cleanContent.trim();
  } catch (e) {
    console.warn('⚠️ extractOriginalText error:', e.message);
    return 'Ошибка обработки текста';
  }
};

// @desc    Создать жалобу на пост + Socket.io эмиссия
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
  try {
    const { postId, reason, description } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация для создания жалобы',
      });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    if (post.user && post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя пожаловаться на свой пост',
      });
    }

    const existingReport = await Report.findOne({
      post: postId,
      reportedBy: req.user._id,
      status: 'pending',
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'Вы уже подавали жалобу на этот пост',
      });
    }

    const report = await Report.create({
      post: postId,
      reportedBy: req.user._id,
      reason: reason || 'other',
      description: description || '',
      status: 'pending',
    });

    // 🔴 Socket.io: Эмиссия новой жалобы для админов
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        const payload = {
          report: {
            _id: report._id,
            reason: report.reason,
            description: report.description,
            status: report.status,
            createdAt: report.createdAt,
            post: { _id: report.post, author: post?.author || 'Аноним' },
            reportedBy: report.reportedBy,
          },
        };
        
        console.log('📡 Emitting new-report to admins:', payload.report._id);
        io.to('admins').emit('new-report', payload);
      }
    } catch (emitError) {
      console.warn('⚠️ Failed to emit new-report:', emitError?.message || emitError);
    }

    res.status(201).json({
      success: true,
      message: 'Жалоба успешно создана',
      report,
    });
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании жалобы',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Получить жалобу по ID
// @route   GET /api/reports/:id
// @access  Private/Admin/Moderator
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('post', 'content author user image')
      .populate('reportedBy', 'username email')
      .populate('resolvedBy', 'username');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    const originalText = report.post?.content ? extractOriginalText(report.post.content) : 'Пост удалён';

    res.status(200).json({
      success: true,
      report: {
        ...report.toObject(),
        originalPostText: originalText,
      },
    });
  } catch (error) {
    console.error('❌ Error getting report:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении жалобы',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Получить все жалобы
// @route   GET /api/reports
// @access  Private/Admin/Moderator
const getReports = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate('post', 'content author user')
      .populate('reportedBy', 'username email')
      .populate('resolvedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Report.countDocuments(query);

    // 🔴 Безопасная обработка: extractOriginalText с проверкой на null
    const reportsWithOriginalText = reports.map(report => {
      let originalText = 'Пост удалён';
      if (report.post?.content) {
        try {
          originalText = extractOriginalText(report.post.content);
        } catch (e) {
          console.warn('⚠️ Failed to extract text:', e.message);
        }
      }
      return {
        ...report,
        originalPostText: originalText,
      };
    });

    res.status(200).json({
      success: true,
      count: reportsWithOriginalText.length,
      total: count,
      pages: Math.ceil(count / limit),
      page: parseInt(page),
      reports: reportsWithOriginalText,
    });
  } catch (error) {
    console.error('❌ Error getting reports:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении жалоб',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Получить статистику жалоб
// @route   GET /api/reports/stats
// @access  Private/Admin/Moderator
const getReportStats = async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const pending = await Report.countDocuments({ status: 'pending' });
    const approved = await Report.countDocuments({ status: 'approved' });
    const rejected = await Report.countDocuments({ status: 'rejected' });

    res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
      },
    });
  } catch (error) {
    console.error('❌ Error getting report stats:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Обработать жалобу с баном
// @route   PATCH /api/reports/:id/ban
// @access  Private/Admin/Moderator
const processWithBan = async (req, res) => {
  try {
    const { banDuration, banReason } = req.body;

    const report = await Report.findById(req.params.id)
      .populate('post')
      .populate('reportedBy');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Жалоба уже обработана',
      });
    }

    // Удаляем пост
    if (report.post) {
      report.post.isDeleted = true;
      await report.post.save();
    }

    // Банним автора поста
    if (report.post?.user) {
      const userToBan = await User.findById(report.post.user);
      
      if (userToBan) {
        userToBan.isActive = false;
        
        if (banDuration && banDuration > 0) {
          userToBan.bannedUntil = new Date(Date.now() + parseInt(banDuration));
        } else {
          userToBan.bannedUntil = null;
        }

        await userToBan.save();

        await Ban.create({
          user: userToBan._id,
          bannedBy: req.user._id,
          reason: banReason || report.reason,
          expiresAt: userToBan.bannedUntil,
          isPermanent: !userToBan.bannedUntil,
        });
      }
    }

    report.status = 'approved';
    report.resolvedBy = req.user._id;
    await report.save();

    // 🔴 Socket.io: Эмиссия обновления жалобы
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to('admins').emit('report-updated', {
          reportId: report._id,
          status: report.status,
          resolvedBy: req.user?.username || 'Admin',
        });
      }
    } catch (emitError) {
      console.warn('⚠️ Failed to emit report-updated:', emitError?.message || emitError);
    }

    res.status(200).json({
      success: true,
      message: 'Жалоба одобрена, пользователь забанен',
      report,
    });
  } catch (error) {
    console.error('❌ Error processing report:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке жалобы',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Отклонить жалобу
// @route   PATCH /api/reports/:id/reject
// @access  Private/Admin/Moderator
const rejectReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Жалоба уже обработана',
      });
    }

    report.status = 'rejected';
    report.resolvedBy = req.user._id;
    await report.save();

    // 🔴 Socket.io: Эмиссия обновления жалобы
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to('admins').emit('report-updated', {
          reportId: report._id,
          status: report.status,
          resolvedBy: req.user?.username || 'Admin',
        });
      }
    } catch (emitError) {
      console.warn('⚠️ Failed to emit report-updated:', emitError?.message || emitError);
    }

    res.status(200).json({
      success: true,
      message: 'Жалоба отклонена',
      report,
    });
  } catch (error) {
    console.error('❌ Error rejecting report:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отклонении жалобы',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// @desc    Удалить жалобу
// @route   DELETE /api/reports/:id
// @access  Private/Admin
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Жалоба удалена',
    });
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении жалобы',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

module.exports = {
  createReport,
  getReportById,
  getReports,
  getReportStats,
  processWithBan,
  rejectReport,
  deleteReport,
};