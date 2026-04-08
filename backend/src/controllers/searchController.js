const Thread = require('../models/Thread');

// 🔴 ПРОСТАЯ нормализация: кириллица → латиница
const normalizeText = (text) => {
  if (!text) return '';
  const map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z',
    'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
    'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  };
  
  let result = text.toLowerCase();
  for (const [cyr, lat] of Object.entries(map)) {
    result = result.replace(new RegExp(cyr, 'g'), lat);
  }
  return result.replace(/[^a-z0-9\s]/g, '');
};

// 🔴 Расстояние Левенштейна
const levenshtein = (s1, s2) => {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] 
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
};

// 🔴 ОЧЕНЬ АГРЕССИВНЫЙ fuzzy-матч (до 3 ошибок)
const isFuzzyMatch = (text, query) => {
  if (!text || !query) return false;
  
  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  
  // Точное совпадение
  if (normText.includes(normQuery)) return { match: true, distance: 0 };
  
  // Проверяем слова
  const words = normText.split(/\s+/);
  for (const word of words) {
    if (word.length < 2) continue;
    
    const dist = levenshtein(word, normQuery);
    // 🔴 ДОПУСКАЕМ ДО 3 ОШИБОК (было 2)
    if (dist <= 3) return { match: true, distance: dist };
    
    // Проверяем подстроки
    for (let len = Math.max(2, normQuery.length - 1); len <= word.length; len++) {
      for (let i = 0; i <= word.length - len; i++) {
        const sub = word.slice(i, i + len);
        const subDist = levenshtein(sub, normQuery);
        if (subDist <= 3) return { match: true, distance: subDist };
      }
    }
  }
  
  return { match: false, distance: 999 };
};

// @desc    Поиск с АГРЕССИВНЫМ fuzzy-матчингом
const searchThreads = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, board } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Минимум 2 символа для поиска',
      });
    }

    const searchTerm = q.trim();
    console.log(`\n🔍 ===== ПОИСК: "${searchTerm}" =====`);
    
    const baseFilter = { isDeleted: false };
    if (board) baseFilter.board = board;

    // 🔹 ШАГ 1: ОЧЕНЬ ШИРОКИЙ ЗАПРОС (без сложных regex)
    const candidates = await Thread.find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
        { author: { $regex: searchTerm, $options: 'i' } },
        // 🔴 ДОПОЛНИТЕЛЬНО: ищем без последней буквы
        { title: { $regex: searchTerm.slice(0, -1), $options: 'i' } },
        { content: { $regex: searchTerm.slice(0, -1), $options: 'i' } },
        // 🔴 И без первой буквы
        { title: { $regex: searchTerm.slice(1), $options: 'i' } },
        { content: { $regex: searchTerm.slice(1), $options: 'i' } },
      ],
      ...baseFilter,
    })
    .select('title content author board postCount lastPostAt createdAt isPinned')
    .populate('board', 'name code description')
    .limit(100)  // 🔴 Берём МНОГО кандидатов
    .lean();

    console.log(`📦 Кандидатов найдено: ${candidates.length}`);

    // 🔹 ШАГ 2: FUZZY-ФИЛЬТРАЦИЯ
    const fuzzyResults = [];
    for (const thread of candidates) {
      const titleMatch = isFuzzyMatch(thread.title, searchTerm);
      const contentMatch = isFuzzyMatch(thread.content, searchTerm);
      const authorMatch = isFuzzyMatch(thread.author, searchTerm);
      
      if (titleMatch.match || contentMatch.match || authorMatch.match) {
        const bestDistance = Math.min(
          titleMatch.distance,
          contentMatch.distance,
          authorMatch.distance
        );
        fuzzyResults.push({ ...thread, _distance: bestDistance });
      }
    }

    console.log(`✅ После fuzzy-фильтра: ${fuzzyResults.length}`);

    // 🔹 ШАГ 3: РАНЖИРОВАНИЕ
    const ranked = fuzzyResults
      .map(t => ({
        ...t,
        _score: 100 - (t._distance * 15),  // Чем меньше расстояние, тем вышеscore
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    console.log(`🏆 В результате: ${ranked.length}`);
    console.log(`=============================\n`);

    // 🔹 ШАГ 4: ГРУППИРОВКА
    const grouped = ranked.reduce((acc, t) => {
      const code = t.board?.code || 'unknown';
      if (!acc[code]) acc[code] = { board: t.board, threads: [] };
      acc[code].threads.push(t);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      query: searchTerm,
      count: ranked.length,
      total: ranked.length,
      page: parseInt(page),
      pages: 1,
      results: Object.values(grouped),
      debug: {
        candidates: candidates.length,
        fuzzyFiltered: fuzzyResults.length,
        final: ranked.length,
      },
    });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Ошибка поиска',
      error: error.message,
    });
  }
};

module.exports = { searchThreads };