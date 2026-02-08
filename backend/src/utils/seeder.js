const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Board = require('../models/Board');
const User = require('../models/User');

dotenv.config();

// Подключаемся к базе данных
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Подключено к MongoDB'))
  .catch((err) => {
    console.error('❌ Ошибка подключения:', err);
    process.exit(1);
  });

// Данные для заполнения
const boards = [
  {
    name: 'Случайное',
    code: 'b',
    description: 'Обсуждение всего на свете',
  },
  {
    name: 'Технологии',
    code: 'tech',
    description: 'IT, программирование, гаджеты',
  },
  {
    name: 'Игры',
    code: 'games',
    description: 'Видеоигры и игровая индустрия',
  },
  {
    name: 'Культура',
    code: 'culture',
    description: 'Кино, музыка, литература',
  },
];

const adminUser = {
  username: 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@imagerboard.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  role: 'admin',
};

// Функция заполнения данными
const seedDatabase = async () => {
  try {
    // Удаляем существующие данные
    await Board.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Старые данные удалены');

    // Создаем борды
    await Board.insertMany(boards);
    console.log('✅ Борды созданы:', boards.length);

    // Создаем админа
    await User.create(adminUser);
    console.log('✅ Администратор создан');

    console.log('🎉 База данных успешно заполнена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error);
    process.exit(1);
  }
};

// Запускаем скрипт
seedDatabase();