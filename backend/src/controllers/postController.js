const Post = require('../models/Post');
const Thread = require('../models/Thread');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');

// Функция для очистки текста от лишних переносов строк
const cleanText = (text) => {
  if (!text) return text;
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
};

// @desc    Получить все посты треда
// @route   GET /api/posts/thread/:threadId
// @access  Public
const getPosts = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const thread = await Thread.findById(threadId);
    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    const posts = await Post.find({ thread: threadId, isDeleted: false })
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username')
      .lean();

    const count = await Post.countDocuments({
      thread: threadId,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении постов',
      error: error.message,
    });
  }
};

// @desc    Создать пост
// @route   POST /api/posts/thread/:threadId
// @access  Protected (требуется авторизация)
const createPost = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content, author } = req.body;

    const thread = await Thread.findById(threadId);
    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    const cleanedContent = cleanText(content);

    let image = null;
    if (req.file) {
      image = `/uploads/images/${req.file.filename}`;
    }

    // 🔴 Генерируем хеш IP + User-Agent (для анонимов)
    const ipHash = req.user 
      ? null  // Для зарегистрированных не нужно
      : crypto.createHash('sha256')
          .update(`${req.ip}|${req.headers['user-agent']}`)
          .digest('hex')
          .slice(0, 16);  // Первые 16 символов

    const postData = {
  thread: threadId,
  content: cleanedContent,
  author: req.user?.username || author || 'Аноним',
  image,
  user: req.user?._id || null,  // ← Сохраняем ID авторизованного пользователя
  ipHash: ipHash,
};
    const post = await Post.create(postData);
    await thread.incrementPostCount();

    res.status(201).json({
      success: true,
      message: 'Пост создан успешно',
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании поста',
      error: error.message,
    });
  }
};

// Вспомогательная функция для хеширования анонима
const generateAnonymousHash = (ip, userAgent) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(`${ip}|${userAgent}`).digest('hex').slice(0, 16);
};

// @desc    Обновить пост
// @route   PUT /api/posts/:id
// @access  Private/Admin
const updatePost = async (req, res) => {
  try {
    const { content, author } = req.body;

    let post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    const cleanedContent = cleanText(content);

    post.content = cleanedContent || post.content;
    post.author = author || post.author;

    if (req.file) {
      post.image = `/uploads/images/${req.file.filename}`;
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Пост обновлён успешно',
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении поста',
      error: error.message,
    });
  }
};

// @desc    Удалить пост
// @route   DELETE /api/posts/:id
// @access  Private (автор поста или админ/модератор)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    const isAuthor = post.user && post.user._id.toString() === req.user._id.toString();
    const isAdminOrModerator = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isAuthor && !isAdminOrModerator) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для удаления этого поста',
      });
    }

    post.isDeleted = true;
    await post.save();

    const thread = await Thread.findById(post.thread);
    if (thread && thread.postCount > 1) {
      await thread.decrementPostCount();
    }

    res.status(200).json({
      success: true,
      message: 'Пост удалён успешно',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении поста',
      error: error.message,
    });
  }
};

// @desc    Лайкнуть пост + создать уведомление
// @route   POST /api/posts/:id/like
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user');

    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, message: 'Пост не найден' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    await post.like(req.user._id);

    // 🔴 Создаём уведомление для автора поста (если это не он сам)
    if (post.user && post.user._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: post.user._id,
        type: 'like',
        post: post._id,
        thread: post.thread,
        fromUser: req.user._id,
        title: 'Новый лайк',
        message: `${req.user.username} лайкнул ваш пост`,
        metadata: {
          postContent: post.content.substring(0, 100),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Пост лайкнут',
      likes: post.likes,
      likedBy: post.likedBy,
    });
  } catch (error) {
    if (error.message === 'Вы уже лайкали этот пост') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Ошибка при лайке поста', error: error.message });
  }
};

// @desc    Убрать лайк с поста
// @route   POST /api/posts/:id/unlike
const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, message: 'Пост не найден' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    await post.unlike(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Лайк убран',
      likes: post.likes,
      likedBy: post.likedBy,
    });
  } catch (error) {
    if (error.message === 'Вы не лайкали этот пост') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Ошибка при удалении лайка', error: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
};