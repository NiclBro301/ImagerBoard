const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Кому уведомление
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Пользователь обязателен'],
      index: true,
    },
    
    // Тип уведомления
    type: {
      type: String,
      enum: [
        'like',           // Кто-то лайкнул ваш пост
        'reply',          // Кто-то ответил в вашем треде
        'quote',          // Кто-то процитировал ваш пост
        'mention',        // Кто-то упомянул вас (@username)
        'report_resolved' // Ваша жалоба обработана
      ],
      required: true,
    },
    
    // Связанные сущности
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Контент уведомления
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    
    // Превью оригинального сообщения (для цитирования)
    quotePreview: {
      type: String,
      maxlength: 200,
    },
    
    // Статус
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Метаданные
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Индексы для оптимизации
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

// Метод для пометки как прочитанное
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  await this.save();
  return this;
};

// Статический метод для получения непрочитанных
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ user: userId, isRead: false });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;