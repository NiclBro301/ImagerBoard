const express = require('express');
const router = express.Router();
const {
  createBan,
  getBans,
  getBanById,
  unban,
  extendBan,
  checkBan,
} = require('../controllers/banController');
const { protect, authorize } = require('../middleware/auth');

// Проверка бана (публичный)
router.get('/check', checkBan);

// Защищённые роуты (только для модераторов и админов)
router.post('/', protect, authorize('admin', 'moderator'), createBan);
router.get('/', protect, authorize('admin', 'moderator'), getBans);
router.get('/:id', protect, authorize('admin', 'moderator'), getBanById);
router.patch('/:id/unban', protect, authorize('admin', 'moderator'), unban);
router.patch('/:id/extend', protect, authorize('admin', 'moderator'), extendBan);

module.exports = router;