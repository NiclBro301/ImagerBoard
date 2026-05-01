const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    required: [true, 'Пост должен принадлежать треду'],
  },
  content: {
    type: String,
    required: [true, 'Содержимое поста обязательно'],
    maxlength: [10000, 'Пост не может быть длиннее 10000 символов'],
  },
  author: {
    type: String,
    default: 'Аноним',
    maxlength: [50, 'Имя автора не может быть длиннее 50 символов'],
  },
  image: {
    type: String,
    default: null,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  ipHash: {
    type: String,
    maxlength: [16, 'Хеш IP не может быть длиннее 16 символов'],
    default: null,
  },
  likes: {
    type: Number,
    default: 0,
    min: 0,
  },
  likedBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// 🔴 Индексы для оптимизации запросов
postSchema.index({ thread: 1, createdAt: 1 });
postSchema.index({ user: 1, isDeleted: 1 });

// 🔴 Метод: Лайкнуть пост
postSchema.methods.like = async function(userId) {
  // 🔴 Нормализуем userId к строке для сравнения
  const userIdStr = userId.toString();
  
  // 🔴 Проверяем, нет ли уже этого пользователя в likedBy
  const alreadyLiked = this.likedBy.some(id => id.toString() === userIdStr);
  
  if (alreadyLiked) {
    throw new Error('Вы уже лайкали этот пост');
  }
  
  // 🔴 Добавляем пользователя в likedBy и увеличиваем счётчик
  this.likedBy.push(userId);
  this.likes = this.likedBy.length;
  
  return this.save();
};

// 🔴 Метод: Убрать лайк с поста
postSchema.methods.unlike = async function(userId) {
  // 🔴 Нормализуем userId к строке для сравнения
  const userIdStr = userId.toString();
  
  // 🔴 Фильтруем массив: оставляем только тех, кто не этот пользователь
  this.likedBy = this.likedBy.filter(id => id.toString() !== userIdStr);
  this.likes = this.likedBy.length;
  
  return this.save();
};

// 🔴 Виртуальное поле: проверил ли текущий пользователь лайк
postSchema.virtual('isLikedBy').get(function() {
  return function(userId) {
    if (!userId) return false;
    const userIdStr = userId.toString();
    return this.likedBy.some(id => id.toString() === userIdStr);
  };
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;