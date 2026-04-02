const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  processReport,
  rejectReport,
  deleteReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Все роуты требуют авторизации
router.use(protect);

// Публичные роуты (требуется просто авторизация)
router.post('/', createReport);

// Роуты для модераторов и админов
router.use(authorize('admin', 'moderator'));

router.route('/')
  .get(getReports);

router.route('/:id')
  .get(getReportById)
  .delete(deleteReport);

// 🔴 Обработка жалобы (одобрить или отклонить)
router.patch('/:id/process', processReport);

// 🔴 Отклонение жалобы (алиас)
router.patch('/:id/reject', rejectReport);

module.exports = router;