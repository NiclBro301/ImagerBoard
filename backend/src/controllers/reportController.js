const Report = require('../models/Report');
const Post = require('../models/Post');
const User = require('../models/User');
const Ban = require('../models/Ban');
const Thread = require('../models/Thread');

// @desc    Создать жалобу на пост
// @route   POST /api/reports
// @access  Private (только авторизованные)
const createReport = async (req, res) => {
  try {
    const { postId, reason, description } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация для отправки жалобы',
      });
    }

    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    const existingReport = await Report.findOne({
      post: postId,
      user: req.user._id,
      status: 'pending',
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'Вы уже отправляли жалобу на этот пост',
      });
    }

    const report = await Report.create({
      post: postId,
      user: req.user._id,
      reason,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Жалоба отправлена успешно',
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании жалобы',
      error: error.message,
    });
  }
};

// @desc    Получить все жалобы
// @route   GET /api/reports
// @access  Private/Admin/Moderator
const getReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .populate('post', 'content author user')
      .populate('user', 'username email')
      .populate('bannedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Report.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: reports.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении жалоб',
      error: error.message,
    });
  }
};

// @desc    Получить жалобу по ID
// @route   GET /api/reports/:id
// @access  Private/Admin/Moderator
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('post', 'content author user')
      .populate('user', 'username email')
      .populate('bannedBy', 'username')
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении жалобы',
      error: error.message,
    });
  }
};

// @desc    Обработать жалобу (одобрить или отклонить)
// @route   PATCH /api/reports/:id/process
// @access  Private/Admin/Moderator
const processReport = async (req, res) => {
  console.log('🔍 Начало обработки жалобы');
  console.log('   ID жалобы:', req.params.id);
  console.log('   Действие:', req.body.action);
  console.log('   Модератор:', req.user?._id);

  try {
    const { id: reportId } = req.params;
    const { action, notes } = req.body; // action: 'approve' или 'reject'

    const report = await Report.findById(reportId).populate('post');
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Жалоба не найдена' 
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Жалоба уже обработана' 
      });
    }

    if (action === 'approve') {
      // 🔹 ОДОБРИТЬ: удалить пост + пометить жалобу
      const post = report.post;
      
      if (post) {
        // Мягкое удаление поста
        post.isDeleted = true;
        await post.save();

        // Декрементируем счётчик постов треда
        const thread = await Thread.findById(post.thread);
        if (thread && thread.postCount > 0) {
          thread.postCount -= 1;
          await thread.save();
        }

        console.log('   ✅ Пост удалён:', post._id);
      }

      // Помечаем жалобу как обработанную
      report.status = 'banned'; // Статус "banned" = одобрена
      report.actionTaken = 'delete_post';
      report.moderatorNotes = notes || 'Жалоба одобрена';
      report.bannedBy = req.user._id;
      report.bannedAt = Date.now();
      await report.save();

      console.log('   ✅ Жалоба одобрена');

      res.status(200).json({
        success: true,
        message: 'Жалоба одобрена, пост удалён',
      });

    } else if (action === 'reject') {
      // 🔹 ОТКЛОНИТЬ: просто меняем статус
      report.status = 'rejected';
      report.actionTaken = 'none';
      report.moderatorNotes = notes || 'Жалоба отклонена';
      report.bannedBy = req.user._id;
      report.bannedAt = Date.now();
      await report.save();

      console.log('   ❌ Жалоба отклонена');

      res.status(200).json({
        success: true,
        message: 'Жалоба отклонена',
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Неверное действие. Используйте "approve" или "reject"',
      });
    }
  } catch (error) {
    console.error('❌ Ошибка обработки жалобы:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Отклонить жалобу (алиас для processReport с action='reject')
// @route   PATCH /api/reports/:id/reject
// @access  Private/Admin/Moderator
const rejectReport = async (req, res) => {
  req.body.action = 'reject';
  return await processReport(req, res);
};

// @desc    Удалить жалобу
// @route   DELETE /api/reports/:id
// @access  Private/Admin
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба не найдена',
      });
    }

    await report.deleteOne();

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
  createReport,
  getReports,
  getReportById,
  processReport,
  rejectReport,
  deleteReport,
};