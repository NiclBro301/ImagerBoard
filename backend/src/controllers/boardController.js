const Board = require('../models/Board');

// @desc    Получить все борды
// @route   GET /api/boards
// @access  Public
const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении бордов',
      error: error.message,
    });
  }
};


// @desc    Получить борд по коду
// @route   GET /api/boards/code/:code
// @access  Public
const getBoardByCode = async (req, res) => {
  try {
    const board = await Board.findOne({ 
      code: req.params.code,
      isActive: true 
    }).select('-__v');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Борд не найден',
      });
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении борда',
      error: error.message,
    });
  }
};

// @desc    Получить борд по ID
// @route   GET /api/boards/:id
// @access  Public
const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .select('-__v');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Борд не найден',
      });
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении борда',
      error: error.message,
    });
  }
};

// @desc    Создать борд
// @route   POST /api/boards
// @access  Private/Admin
const createBoard = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Проверяем, существует ли борд с таким кодом
    const existingBoard = await Board.findOne({ code: code.toLowerCase() });
    if (existingBoard) {
      return res.status(400).json({
        success: false,
        message: 'Борд с таким кодом уже существует',
      });
    }

    // Создаем новый борд
    const board = await Board.create({
      name,
      code: code.toLowerCase(),
      description,
    });

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании борда',
      error: error.message,
    });
  }
};

// @desc    Обновить борд
// @route   PUT /api/boards/:id
// @access  Private/Admin
const updateBoard = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;

    let board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Борд не найден',
      });
    }

    // Обновляем поля
    board.name = name || board.name;
    board.description = description || board.description;
    board.isActive = isActive !== undefined ? isActive : board.isActive;

    // Если меняется код, проверяем на дубликаты
    if (code && code.toLowerCase() !== board.code) {
      const existingBoard = await Board.findOne({ 
        code: code.toLowerCase(),
        _id: { $ne: board._id } 
      });
      
      if (existingBoard) {
        return res.status(400).json({
          success: false,
          message: 'Борд с таким кодом уже существует',
        });
      }
      
      board.code = code.toLowerCase();
    }

    await board.save();

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении борда',
      error: error.message,
    });
  }
};

// @desc    Удалить борд
// @route   DELETE /api/boards/:id
// @access  Private/Admin
const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Борд не найден',
      });
    }

    // Мягкое удаление (деактивация)
    board.isActive = false;
    await board.save();

    res.status(200).json({
      success: true,
      message: 'Борд успешно деактивирован',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении борда',
      error: error.message,
    });
  }
};

module.exports = {
  getBoards,
  getBoardByCode,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
};