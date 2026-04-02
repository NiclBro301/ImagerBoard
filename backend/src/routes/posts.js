const express = require('express');
const router = express.Router();
const {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} = require('../controllers/postController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');  // 🔴 Правильный импорт

// Полный путь: /posts/thread/:threadId
router.route('/thread/:threadId')
  .get(getPosts)
  .post(protect, upload.single('image'), createPost);  // ← Теперь работает

router.route('/:id')
  .put(protect, authorize('admin', 'moderator'), updatePost)
  .delete(protect, authorize('admin', 'moderator'), deletePost);

router.route('/:id/like')
  .post(protect, likePost);

router.route('/:id/unlike')
  .post(protect, unlikePost);

module.exports = router;