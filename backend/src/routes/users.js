const express = require('express');
const router = express.Router();
const {
  getUsers,
  getAnonymousUsers,  // ← Новая функция
  getUserById,
  updateUser,
  banUser,
  unbanUser,
  getUserReports,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getUsers);

router.route('/anonymous')  // ← Новый роут
  .get(getAnonymousUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser);

router.route('/:id/ban')
  .post(banUser);

router.route('/:id/unban')
  .post(unbanUser);

router.route('/:id/reports')
  .get(getUserReports);

module.exports = router;