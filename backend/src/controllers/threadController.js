const Thread = require('../models/Thread');
const Board = require('../models/Board');
const Post = require('../models/Post');

// @desc    Получить треды борда
// @route   GET /boards/:code/threads
// @access  Public
const getThreads = async (req, res) => {
  try {
    // 🔴 ИСПРАВЛЕНО: берём code из params, не из query
    const { code } = req.params;
    
    console.log('🔍 getThreads: code =', code);  // ← Лог для отладки

    // Найти борд по коду
    const board = await Board.findOne({ code: code });
    if (!board) {
      console.log('❌ Борд не найден:', code);
      return res.status(404).json({ 
        success: false, 
        message: 'Борд не найден' 
      });
    }

    // Получить треды этого борда
    const threads = await Thread.find({ board: board._id })
  .populate('user', 'username')      // ← Теперь работает, т.к. поле есть в схеме
  .populate('lastPostBy', 'username')
  .sort({ isPinned: -1, createdAt: -1 })
  .lean();

    console.log('✅ getThreads: найдено тредов:', threads.length);

    res.status(200).json({
      success: true,
      count: threads.length,
      threads,
    });
  } catch (error) {
    console.error('❌ Error in getThreads:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении тредов',
      error: error.message,
    });
  }
};

// @desc    Получить тред по ID
// @route   GET /boards/thread/:id
// @access  Public
const getThreadById = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate('board', 'name code')
      .lean();

    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    res.status(200).json({
      success: true,
      thread,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении треда',
      error: error.message,
    });
  }
};

// @desc    Создать тред
// @route   POST /boards/:code/threads
// @access  Private
const createThread = async (req, res) => {
  try {
    const { code } = req.params;  // 🔴 Берём code из params
    const { title, content, author } = req.body;

    // Находим борд
    const board = await Board.findOne({ code: code, isActive: true });
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Борд не найден',
      });
    }

    // Обрабатываем изображение (если загружено)
    let image = null;
    if (req.file) {
      image = `/uploads/images/${req.file.filename}`;
    }

    // Создаём тред
    const thread = await Thread.create({
      board: board._id,
      title,
      content,
      author: author || 'Аноним',
      image,
      user: req.user?._id || null,  // 🔴 Сохраняем автора если авторизован
    });

    // Инкрементируем счётчик тредов борда
    await board.incrementThreadCount();

    res.status(201).json({
      success: true,
      message: 'Тред создан успешно',
      thread,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании треда',
      error: error.message,
    });
  }
};

// @desc    Обновить тред
// @route   PUT /boards/thread/:id
// @access  Private/Admin
const updateThread = async (req, res) => {
  try {
    const { title, content, author, isPinned } = req.body;

    let thread = await Thread.findById(req.params.id);

    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    // Обновляем поля
    thread.title = title || thread.title;
    thread.content = content || thread.content;
    thread.author = author || thread.author;
    thread.isPinned = isPinned !== undefined ? isPinned : thread.isPinned;

    // Обрабатываем изображение
    if (req.file) {
      thread.image = `/uploads/images/${req.file.filename}`;
    }

    await thread.save();

    res.status(200).json({
      success: true,
      message: 'Тред обновлён успешно',
      thread,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении треда',
      error: error.message,
    });
  }
};

// @desc    Удалить тред
// @route   DELETE /boards/thread/:id
// @access  Private/Admin
const deleteThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    // Мягкое удаление
    thread.isDeleted = true;
    await thread.save();

    // Декрементируем счётчик тредов борда
    const board = await Board.findById(thread.board);
    if (board) {
      await board.decrementThreadCount();
    }

    res.status(200).json({
      success: true,
      message: 'Тред удалён успешно',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении треда',
      error: error.message,
    });
  }
};

// @desc    Закрепить тред
// @route   PATCH /boards/thread/:id/pin
// @access  Private/Admin
const pinThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    thread.isPinned = true;
    await thread.save();

    res.status(200).json({
      success: true,
      message: 'Тред закреплён',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при закреплении треда',
      error: error.message,
    });
  }
};

// @desc    Открепить тред
// @route   PATCH /boards/thread/:id/unpin
// @access  Private/Admin
const unpinThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    thread.isPinned = false;
    await thread.save();

    res.status(200).json({
      success: true,
      message: 'Тред откреплён',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при откреплении треда',
      error: error.message,
    });
  }
};

module.exports = {
  getThreads,
  getThreadById,
  createThread,
  updateThread,
  deleteThread,
  pinThread,
  unpinThread,
};