const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Пост обязателен'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Пользователь обязателен'],
    },
    reason: {
      type: String,
      required: [true, 'Причина отчета обязательна'],
      enum: ['spam', 'offensive', 'illegal', 'harassment', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов'],
    },
    status: {
      type: String,
      enum: ['pending', 'banned', 'rejected'],
      default: 'pending',
    },
    actionTaken: {  // ← ЭТО ПОЛЕ ДОЛЖНО БЫТЬ!
      type: String,
      enum: ['ban_user', 'ban_post_author', 'delete_post', 'warning', 'none'],
      default: 'none',
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    moderatorNotes: {
      type: String,
      maxlength: [1000, 'Заметки не могут быть длиннее 1000 символов'],
    },
  },
  {
    timestamps: true,
  }
);

// Метод для обработки жалобы с баном
reportSchema.methods.processWithBan = async function (moderatorId, action, notes) {
  this.status = 'banned';
  this.actionTaken = action;
  this.bannedBy = moderatorId;
  this.bannedAt = Date.now();
  this.moderatorNotes = notes;
  await this.save();
};

// Метод для отклонения жалобы
reportSchema.methods.reject = async function (moderatorId, notes) {
  this.status = 'rejected';
  this.bannedBy = moderatorId;
  this.bannedAt = Date.now();
  this.moderatorNotes = notes;
  await this.save();
};

// Создаем индексы для оптимизации
reportSchema.index({ post: 1, status: 1 });
reportSchema.index({ user: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;