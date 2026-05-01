const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // 🔴 Пост, на который пожаловались
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Пост обязателен'],
  },
  
  // 🔴 Пользователь, который подал жалобу ← ДОБАВЛЕНО
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Пользователь обязателен'],
  },
  
  // 🔴 Причина жалобы
  reason: {
    type: String,
    required: [true, 'Причина обязательна'],
    enum: ['spam', 'offensive', 'illegal', 'harassment', 'other'],
    default: 'other',
  },
  
  // 🔴 Описание нарушения
  description: {
    type: String,
    maxlength: [500, 'Описание не может быть длиннее 500 символов'],
    default: '',
  },
  
  // 🔴 Статус жалобы
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  
  // 🔴 Модератор, который обработал жалобу
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // 🔴 Заметки модератора
  moderatorNotes: {
    type: String,
    maxlength: [500, 'Заметки не могут быть длиннее 500 символов'],
    default: '',
  },
  
  // 🔴 Дата обработки
  resolvedAt: {
    type: Date,
    default: null,
  },
  
}, {
  timestamps: true, // createdAt, updatedAt
});

// 🔴 Индексы для оптимизации запросов
reportSchema.index({ post: 1, status: 1 });  // Быстрый поиск жалоб по посту
reportSchema.index({ reportedBy: 1, createdAt: -1 });  // Жалобы пользователя по дате
reportSchema.index({ status: 1, createdAt: -1 });  // Жалобы по статусу

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;