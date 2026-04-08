const express = require('express');
const router = express.Router();
const {
  createReport,
  getReports,
  getReportById,
  processWithBan, 
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

// 🔴 ИСПРАВЛЕНО: processWithBan вместо processReport
router.patch('/:id/ban', processWithBan);

// 🔴 Отклонение жалобы (алиас)
router.patch('/:id/reject', rejectReport);

module.exports = router;