const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');

// Загружаем переменные окружения
dotenv.config();

// Подключаемся к базе данных
connectDB();

// Создаем приложение Express
const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для парсинга URL-encoded данных
app.use(express.urlencoded({ extended: true }));

// Настройка CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Логирование запросов в режиме разработки
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Статические файлы (изображения)
app.use('/uploads', express.static('uploads'));

// Роуты API
app.use('/api', require('./routes/index'));

// Обработчик 404 ошибок (ИСПРАВЛЕНО: просто используем app.use без пути)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Роут ${req.originalUrl} не найден`,
  });
});

// Глобальный обработчик ошибок
app.use(errorHandler);

module.exports = app;