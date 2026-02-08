const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Борд обязателен'],
    },
    title: {
      type: String,
      required: [true, 'Заголовок обязателен'],
      trim: true,
      maxlength: [100, 'Заголовок не может быть длиннее 100 символов'],
    },
    content: {
      type: String,
      required: [true, 'Содержание обязательно'],
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    author: {
      type: String,
      default: 'Аноним',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    postCount: {
      type: Number,
      default: 1, // Первый пост - это сам тред
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Виртуальное поле для короткого превью
threadSchema.virtual('preview').get(function () {
  return this.content.substring(0, 150) + (this.content.length > 150 ? '...' : '');
});

// Метод для инкремента счетчика постов
threadSchema.methods.incrementPostCount = async function () {
  this.postCount += 1;
  this.lastActivity = Date.now();
  await this.save();
};

// Метод для декремента счетчика постов
threadSchema.methods.decrementPostCount = async function () {
  this.postCount = Math.max(1, this.postCount - 1);
  await this.save();
};

// Метод для пиннинга треда
threadSchema.methods.pin = async function () {
  this.isPinned = true;
  await this.save();
};

// Метод для открепления треда
threadSchema.methods.unpin = async function () {
  this.isPinned = false;
  await this.save();
};

// Создаем индексы для оптимизации запросов
threadSchema.index({ board: 1, createdAt: -1 });
threadSchema.index({ board: 1, isPinned: -1, lastActivity: -1 });

const Thread = mongoose.model('Thread', threadSchema);

module.exports = Thread;