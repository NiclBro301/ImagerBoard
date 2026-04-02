const express = require('express');
const router = express.Router();
const {
  getThreads,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  pinThread,
  unpinThread,
} = require('../controllers/threadController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// 🔴 Роуты для тредов внутри борда
// Полный путь: /boards/:code/threads
router.route('/:code/threads')
  .get(getThreads)
  .post(protect, upload.single('image'), createThread);

// 🔴 Роуты для конкретного треда по ID
// Полный путь: /boards/thread/:id
router.route('/thread/:id')
  .get(getThreadById)
  .put(protect, authorize('admin', 'moderator'), updateThread)
  .delete(protect, authorize('admin', 'moderator'), deleteThread);

// Закрепление/открепление
router.route('/thread/:id/pin')
  .patch(protect, authorize('admin', 'moderator'), pinThread);

router.route('/thread/:id/unpin')
  .patch(protect, authorize('admin', 'moderator'), unpinThread);

module.exports = router;