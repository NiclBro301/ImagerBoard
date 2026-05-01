const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 🔴 Создаём директорию для аватаров если нет
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads/avatars directory');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user?._id + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// 🔴 Разрешённые форматы
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/jfif',
    'image/pjpeg',
    'image/x-jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  
  const allowedExts = ['.jpeg', '.jpg', '.jfif', '.pjpeg', '.png', '.gif', '.webp'];
  const extname = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(extname)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат файла. Разрешены: JPEG, JPG, JFIF, PNG, GIF, WebP'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

module.exports = upload;