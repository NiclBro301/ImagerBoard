const express = require('express');
const router = express.Router();
const {
  getBoards,
  getBoardByCode,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
} = require('../controllers/boardController');
const { protect, authorize } = require('../middleware/auth');

// Публичные роуты
router.get('/', getBoards);                    // GET /boards
router.get('/code/:code', getBoardByCode);     // GET /boards/code/:code ← РАБОЧИЙ ПАТТЕРН
router.get('/:id', getBoardById);              // GET /boards/:id

// Защищённые роуты
router.post('/', protect, authorize('admin', 'moderator'), createBoard);
router.put('/:id', protect, authorize('admin', 'moderator'), updateBoard);
router.delete('/:id', protect, authorize('admin'), deleteBoard);

module.exports = router;