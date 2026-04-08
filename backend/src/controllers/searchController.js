const Thread = require('../models/Thread');

// @desc    Поиск тредов по всем бордам
// @route   GET /api/search?q=запрос
// @access  Public
const searchThreads = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, board } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Поисковый запрос должен содержать минимум 2 символа',
      });
    }

    // 🔹 Базовый фильтр
    const baseFilter = { isDeleted: false };
    if (board) {
      baseFilter.board = board;
    }

    // 🔹 Текстовый поиск MongoDB
    const searchQuery = {
      $text: { $search: q },
      ...baseFilter,
    };

    // 🔹 Выполняем поиск с сортировкой по релевантности
    const threads = await Thread.find(searchQuery)
      .select('title content author board postCount lastPostAt createdAt isPinned')
      .populate('board', 'name code description')
      .sort({ score: { $meta: 'textScore' }, lastPostAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // 🔹 Fallback: если текстовый поиск не дал результатов, ищем по заголовку
    if (threads.length === 0) {
      const fuzzyThreads = await Thread.find({
        title: { $regex: q, $options: 'i' },
        ...baseFilter,
      })
      .select('title content author board postCount lastPostAt createdAt isPinned')
      .populate('board', 'name code description')
      .sort({ lastPostAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
      
      threads.push(...fuzzyThreads);
    }

    // 🔹 Группируем результаты по бордам
    const groupedByBoard = threads.reduce((acc, thread) => {
      const boardCode = thread.board?.code || 'unknown';
      if (!acc[boardCode]) {
        acc[boardCode] = {
          board: thread.board,
          threads: [],
        };
      }
      acc[boardCode].threads.push(thread);
      return acc;
    }, {});

    // 🔹 Преобразуем в массив
    const results = Object.values(groupedByBoard).sort((a, b) => 
      b.threads.length - a.threads.length
    );

    const total = await Thread.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      query: q,
      count: threads.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      results,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске тредов',
      error: error.message,
    });
  }
};

module.exports = {
  searchThreads,
};