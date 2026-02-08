const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Имя пользователя обязательно'],
      unique: true,
      trim: true,
      minlength: [3, 'Имя должно быть не короче 3 символов'],
      maxlength: [30, 'Имя не может быть длиннее 30 символов'],
    },
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Неверный формат email'],
    },
    password: {
      type: String,
      required: [true, 'Пароль обязателен'],
      minlength: [6, 'Пароль должен быть не короче 6 символов'],
      select: false, // Не возвращаем пароль по умолчанию
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    bannedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware для хеширования пароля перед сохранением
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Метод для сравнения паролей
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Метод для обновления времени последнего входа
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = Date.now();
  await this.save();
};

// Метод для проверки бана
userSchema.methods.isBanned = function () {
  return this.bannedUntil && this.bannedUntil > Date.now();
};

// Метод для получения публичных данных пользователя
userSchema.methods.getPublicData = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;