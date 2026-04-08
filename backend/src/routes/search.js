const express = require('express');
const router = express.Router();
const { searchThreads } = require('../controllers/searchController');

// 🔴 Публичный роут для поиска
router.get('/', searchThreads);

module.exports = router;