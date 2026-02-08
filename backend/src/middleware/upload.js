const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Фильтр файлов (только изображения)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Настройка multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000, // 5MB по умолчанию
  },
  fileFilter: fileFilter,
});

// Middleware для обработки и оптимизации изображений
const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const imagePath = req.file.path;
    const optimizedPath = imagePath.replace(/(\.[\w\d_-]+)$/i, '-optimized$1');

    // Оптимизируем изображение с помощью sharp
    await sharp(imagePath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .png({ quality: 80, compressionLevel: 6 })
      .toFile(optimizedPath);

    // Обновляем путь к файлу
    req.file.optimizedPath = optimizedPath;
    req.file.optimizedFilename = path.basename(optimizedPath);

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware для обработки нескольких изображений
const uploadMultiple = upload.array('images', 5); // Максимум 5 изображений

module.exports = {
  upload: upload.single('image'),
  uploadMultiple,
  processImage,
};