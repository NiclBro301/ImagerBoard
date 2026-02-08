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
const {
  validateBoard,
  handleValidationErrors,
} = require('../middleware/validation');

// Публичные роуты
router.get('/', getBoards);
router.get('/code/:code', getBoardByCode);
router.get('/:id', getBoardById);

// Защищенные роуты (только для админов)
router.post(
  '/',
  protect,
  authorize('admin', 'moderator'),
  validateBoard,
  handleValidationErrors,
  createBoard
);
router.put(
  '/:id',
  protect,
  authorize('admin', 'moderator'),
  validateBoard,
  handleValidationErrors,
  updateBoard
);
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteBoard
);

module.exports = router;