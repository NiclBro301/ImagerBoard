const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require('../middleware/validation');

// Публичные роуты
router.post(
  '/register',
  validateRegister,
  handleValidationErrors,
  register
);
router.post('/login', validateLogin, handleValidationErrors, login);
router.post('/logout', logout);

// Защищённые роуты
router.get('/me', protect, getMe);

module.exports = router;