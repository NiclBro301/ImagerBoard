const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
      required: [true, 'Тред обязателен'],
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
    likes: {
      type: Number,
      default: 0,
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

// Виртуальное поле для форматированной даты
postSchema.virtual('createdAtFormatted').get(function () {
  return this.createdAt.toLocaleString('ru-RU');
});

// Метод для лайка поста
postSchema.methods.like = async function () {
  this.likes += 1;
  await this.save();
};

// Метод для удаления лайка
postSchema.methods.unlike = async function () {
  this.likes = Math.max(0, this.likes - 1);
  await this.save();
};

// Создаем индексы для оптимизации запросов
postSchema.index({ thread: 1, createdAt: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;