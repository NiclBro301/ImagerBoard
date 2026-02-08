const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Убрали устаревшие опции useNewUrlParser и useUnifiedTopology
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB подключена успешно');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;