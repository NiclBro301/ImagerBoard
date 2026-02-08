const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Пост обязателен'],
    },
    reason: {
      type: String,
      required: [true, 'Причина отчета обязательна'],
      enum: ['spam', 'offensive', 'illegal', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      maxlength: [500, 'Описание не может быть длиннее 500 символов'],
    },
    reportedBy: {
      type: String, // IP адрес или анонимный идентификатор
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Метод для разрешения отчета
reportSchema.methods.resolve = async function (moderatorId) {
  this.status = 'resolved';
  this.resolvedBy = moderatorId;
  this.resolvedAt = Date.now();
  await this.save();
};

// Метод для отклонения отчета
reportSchema.methods.reject = async function (moderatorId) {
  this.status = 'rejected';
  this.resolvedBy = moderatorId;
  this.resolvedAt = Date.now();
  await this.save();
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;