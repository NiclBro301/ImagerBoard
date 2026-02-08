const { body, validationResult } = require('express-validator');

// Валидация создания борда
const validateBoard = [
  body('name')
    .trim()
    .notEmpty().withMessage('Название обязательно')
    .isLength({ min: 2, max: 50 }).withMessage('Название должно быть от 2 до 50 символов'),
  
  body('code')
    .trim()
    .notEmpty().withMessage('Код обязателен')
    .isLength({ min: 1, max: 10 }).withMessage('Код должен быть от 1 до 10 символов')
    .matches(/^[a-z0-9]+$/).withMessage('Код может содержать только буквы и цифры'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Описание обязательно')
    .isLength({ max: 200 }).withMessage('Описание не может быть длиннее 200 символов'),
];

// Валидация создания треда
const validateThread = [
  body('title')
    .trim()
    .notEmpty().withMessage('Заголовок обязателен')
    .isLength({ min: 1, max: 100 }).withMessage('Заголовок должен быть от 1 до 100 символов'),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Содержание обязательно'),
  
  body('author')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Имя автора не может быть длиннее 50 символов'),
];

// Валидация создания поста
const validatePost = [
  body('content')
    .trim()
    .notEmpty().withMessage('Содержание обязательно'),
  
  body('author')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Имя автора не может быть длиннее 50 символов'),
];

// Валидация регистрации пользователя
const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 30 }).withMessage('Имя должно быть от 3 до 30 символов'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Неверный формат email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен быть не короче 6 символов'),
];

// Валидация входа
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Неверный формат email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен'),
];

// Обработчик ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: errors.array(),
    });
  }
  
  next();
};

module.exports = {
  validateBoard,
  validateThread,
  validatePost,
  validateRegister,
  validateLogin,
  handleValidationErrors,
};