const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
      required: [true, 'Тред обязателен'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    author: {
      type: String,
      default: 'Аноним',
    },
    content: {
      type: String,
      required: [true, 'Содержимое обязательно'],
      maxlength: [5000, 'Пост не может быть длиннее 5000 символов'],
    },
    image: {
      type: String,
      default: null,
    },
    ipHash: {
      type: String,
      default: null,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 🔴 НОВЫЕ МЕТОДЫ ДЛЯ ЛАЙКОВ
postSchema.methods.like = async function (userId) {
  if (!userId) throw new Error('Требуется userId');
  
  // Проверяем, не лайкал ли уже пользователь
  if (this.likedBy.includes(userId)) {
    throw new Error('Вы уже лайкали этот пост');
  }
  
  // Добавляем пользователя в массив лайкнувших
  this.likedBy.push(userId);
  this.likes = this.likedBy.length;
  
  await this.save();
  return this;
};

postSchema.methods.unlike = async function (userId) {
  if (!userId) throw new Error('Требуется userId');
  
  // Проверяем, лайкал ли пользователь
  if (!this.likedBy.includes(userId)) {
    throw new Error('Вы не лайкали этот пост');
  }
  
  // Удаляем пользователя из массива
  this.likedBy = this.likedBy.filter(id => id.toString() !== userId.toString());
  this.likes = this.likedBy.length;
  
  await this.save();
  return this;
};

// Индексы для оптимизации
postSchema.index({ thread: 1, createdAt: 1 });
postSchema.index({ user: 1 });
postSchema.index({ ipHash: 1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;