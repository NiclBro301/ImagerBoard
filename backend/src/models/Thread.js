const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Борд обязателен'],
    },
    // 🔴 ДОБАВЛЕНО: ссылка на автора треда (может быть null для анонимов)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    author: {
      type: String,
      default: 'Аноним',
    },
    title: {
      type: String,
      required: [true, 'Заголовок обязателен'],
      maxlength: [200, 'Заголовок не может быть длиннее 200 символов'],
    },
    content: {
      type: String,
      required: [true, 'Содержимое обязательно'],
      maxlength: [5000, 'Содержимое не может быть длиннее 5000 символов'],
    },
    image: {
      type: String,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,  // Для быстрой сортировки закреплённых
    },
    postCount: {
      type: Number,
      default: 0,
    },
    lastPostAt: {
      type: Date,
      default: null,
    },
    lastPostBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

// 🔴 Методы для инкремента/декремента счётчиков
threadSchema.methods.incrementPostCount = async function () {
  this.postCount += 1;
  this.lastPostAt = Date.now();
  await this.save();
};

threadSchema.methods.decrementPostCount = async function () {
  if (this.postCount > 0) {
    this.postCount -= 1;
    await this.save();
  }
};

// Методы для закрепления
threadSchema.methods.pin = async function () {
  this.isPinned = true;
  await this.save();
};

threadSchema.methods.unpin = async function () {
  this.isPinned = false;
  await this.save();
};

// Индексы для оптимизации
threadSchema.index({ board: 1, isPinned: -1, createdAt: -1 });
threadSchema.index({ board: 1, lastPostAt: -1 });

const Thread = mongoose.model('Thread', threadSchema);

module.exports = Thread;