// Функция для очистки текста от лишних переносов строк
export const cleanText = (text) => {
  if (!text) return text;
  
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
};

// Функция для преобразования переносов строк в <br> теги
export const nl2br = (text) => {
  if (!text) return text;
  
  return text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ));
};

// 🔴 ИСПРАВЛЕННАЯ: Группирует ВСЕ последовательные цитаты в ОДИН блок
export const formatTextWithLineBreaks = (text) => {
  if (!text) return '';
  
  const cleaned = cleanText(text);
  
  // Экранируем HTML
  let escaped = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const lines = escaped.split('\n');
  const result = [];
  let inQuoteBlock = false;
  let quoteBuffer = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isQuote = line.startsWith('&gt;') || line.startsWith('>');
    
    if (isQuote) {
      // Убираем префикс > и добавляем в буфер цитат
      const quoteText = line.replace(/^(&gt;|>)\s?/, '');
      
      if (!inQuoteBlock) {
        // Начинаем новую группу цитат
        inQuoteBlock = true;
        quoteBuffer = [quoteText];
      } else {
        // Продолжаем текущую группу цитат
        quoteBuffer.push(quoteText);
      }
    } else {
      // Это не цитата — сначала закрываем предыдущую группу цитат
      if (inQuoteBlock && quoteBuffer.length > 0) {
        // 🔴 ВСЕ цитаты в ОДНОМ блоке с <br> между ними
        result.push(`<blockquote class="quote-block">${quoteBuffer.join('<br>')}</blockquote>`);
        inQuoteBlock = false;
        quoteBuffer = [];
      }
      
      // Добавляем обычную строку если она не пустая
      if (line.trim().length > 0) {
        result.push(line);
      }
    }
  }
  
  // Закрываем последнюю группу цитат если осталась
  if (inQuoteBlock && quoteBuffer.length > 0) {
    result.push(`<blockquote class="quote-block">${quoteBuffer.join('<br>')}</blockquote>`);
  }
  
  // Собираем результат
  let output = result.join('\n');
  
  // Временная замена blockquote для безопасной обработки
  const placeholders = [];
  output = output.replace(/<blockquote class="quote-block">(.*?)<\/blockquote>/g, (match, content) => {
    const idx = placeholders.length;
    placeholders.push(`<blockquote class="quote-block">${content}</blockquote>`);
    return `__QUOTE_${idx}__`;
  });
  
  // Заменяем переносы на <br>
  output = output.replace(/\n/g, '<br>');
  
  // Восстанавливаем blockquote
  placeholders.forEach((placeholder, idx) => {
    output = output.replace(`__QUOTE_${idx}__`, placeholder);
  });
  
  return output;
};