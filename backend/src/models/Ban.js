const mongoose = require('mongoose');

const banSchema = new mongoose.Schema(
  {
    // Кого банят: пользователь или IP
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    
    // Причина бана
    reason: {
      type: String,
      required: [true, 'Причина бана обязательна'],
      enum: ['spam', 'offensive', 'illegal', 'harassment', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов'],
    },
    
    // Тип бана
    type: {
      type: String,
      enum: ['temporary', 'permanent'],
      default: 'temporary',
    },
    
    // Время бана
    bannedUntil: {
      type: Date,
      default: null, // null = permanent ban
    },
    
    // Кто забанил
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Статус
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Количество предупреждений до бана
    warnings: {
      type: Number,
      default: 0,
    },
    
    // Кто разбанил и когда
    unbannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    unbannedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Метод для проверки, активен ли бан (переименован с isActive на isCurrentlyActive)
banSchema.methods.isCurrentlyActive = function () {
  if (!this.isActive) return false;
  if (!this.bannedUntil) return true; // Permanent ban
  return this.bannedUntil > Date.now();
};

// Метод для разбана
banSchema.methods.unban = async function (moderatorId) {
  this.isActive = false;
  this.unbannedBy = moderatorId;
  this.unbannedAt = Date.now();
  await this.save();
};

// Метод для продления бана
banSchema.methods.extendBan = async function (additionalTime) {
  if (!this.bannedUntil) {
    // Permanent ban cannot be extended
    throw new Error('Permanent ban cannot be extended');
  }
  
  this.bannedUntil = new Date(this.bannedUntil.getTime() + additionalTime);
  await this.save();
};

// Создаем индексы для оптимизации
banSchema.index({ userId: 1, isActive: 1 });
banSchema.index({ ipAddress: 1, isActive: 1 });
banSchema.index({ bannedUntil: 1 });

const Ban = mongoose.model('Ban', banSchema);

module.exports = Ban;