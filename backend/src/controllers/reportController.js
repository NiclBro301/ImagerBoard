const Report = require('../models/Report');
const Post = require('../models/Post');
const User = require('../models/User');
const Ban = require('../models/Ban');

// 🔴 НОВАЯ функция: Извлекает оригинальный текст из поста (без цитат)
const extractOriginalText = (content) => {
  if (!content) return '';
  
  // Очищаем от HTML тегов
  let cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  const lines = cleanContent.split('\n');
  const originalLines = [];
  
  // Берём только строки, которые НЕ являются цитатами
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('>')) {
      originalLines.push(trimmed);
    }
  }
  
  // Если есть оригинальный текст — возвращаем его
  if (originalLines.length > 0) {
    return originalLines.join(' ').trim();
  }
  
  // Если нет оригинального текста, берём последнюю цитату
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

    // 🔴 ДОБАВЛЯЕМ оригинальный текст к каждой жалобе
    const reportsWithOriginalText = reports.map(report => {
      const originalText = report.post ? extractOriginalText(report.post.content) : 'Пост удалён';
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
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении жалоб',
      error: error.message,
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
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики',
      error: error.message,
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
    if (report.post && report.post.user) {
      const userToBan = await User.findById(report.post.user);
      
      if (userToBan) {
        userToBan.isActive = false;
        
        if (banDuration && banDuration > 0) {
          userToBan.bannedUntil = new Date(Date.now() + parseInt(banDuration));
        } else {
          userToBan.bannedUntil = null; // Перманентный бан
        }

        await userToBan.save();

        // Создаём запись о бане
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

    res.status(200).json({
      success: true,
      message: 'Жалоба одобрена, пользователь забанен',
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при обработке жалобы',
      error: error.message,
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

    res.status(200).json({
      success: true,
      message: 'Жалоба отклонена',
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при отклонении жалобы',
      error: error.message,
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
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении жалобы',
      error: error.message,
    });
  }
};

module.exports = {
  getReports,
  getReportStats,
  processWithBan,
  rejectReport,
  deleteReport,
};