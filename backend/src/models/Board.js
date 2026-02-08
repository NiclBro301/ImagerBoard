const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Название борда обязательно'],
      trim: true,
      maxlength: [50, 'Название не может быть длиннее 50 символов'],
    },
    code: {
      type: String,
      required: [true, 'Код борда обязателен'],
      unique: true,  // Это автоматически создаёт индекс
      lowercase: true,
      trim: true,
      maxlength: [10, 'Код не может быть длиннее 10 символов'],
      match: [/^[a-z0-9]+$/, 'Код может содержать только буквы и цифры'],
    },
    description: {
      type: String,
      required: [true, 'Описание обязательно'],
      trim: true,
      maxlength: [200, 'Описание не может быть длиннее 200 символов'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    threadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Виртуальное поле для форматированной даты создания
boardSchema.virtual('createdAtFormatted').get(function () {
  return this.createdAt.toLocaleDateString('ru-RU');
});

// Метод для инкремента счетчика тредов
boardSchema.methods.incrementThreadCount = async function () {
  this.threadCount += 1;
  await this.save();
};

// Метод для декремента счетчика тредов
boardSchema.methods.decrementThreadCount = async function () {
  this.threadCount = Math.max(0, this.threadCount - 1);
  await this.save();
};

// Создаем индексы для оптимизации запросов
// УБРАЛИ: код ниже создаёт дублирующий индекс, так как `unique: true` уже создаёт его
// boardSchema.index({ code: 1 });
boardSchema.index({ createdAt: -1 });

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;