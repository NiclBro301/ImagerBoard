const express = require('express');
const router = express.Router();
const {
  getBoards,
  getBoardByCode,
  createBoard,
  updateBoard,
  deleteBoard,
} = require('../controllers/boardController');
const { protect, authorize } = require('../middleware/auth');

// 🔴 Публичные роуты
router.get('/', getBoards);
router.get('/code/:code', getBoardByCode);  // ← Альтернативный роут, если нужен

// 🔴 Роут с параметром :code (должен быть ПОСЛЕ более специфичных!)
router.route('/:code')
  .get(getBoardByCode)
  .post(protect, authorize('admin', 'moderator'), createBoard)
  .put(protect, authorize('admin', 'moderator'), updateBoard)
  .delete(protect, authorize('admin'), deleteBoard);

module.exports = router;