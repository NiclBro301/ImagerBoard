// Функция для очистки текста от лишних переносов строк
export const cleanText = (text) => {
  if (!text) return text;
  
  return text
    .replace(/\r\n/g, '\n')        // Заменяем Windows переносы
    .replace(/\n{3,}/g, '\n\n')    // Больше 2 переносов → 2 переноса
    .replace(/^\n+|\n+$/g, '');    // Убираем переносы в начале и конце
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

// Функция для безопасного отображения текста с переносами
export const formatTextWithLineBreaks = (text) => {
  if (!text) return '';
  
  // Очищаем текст
  const cleaned = cleanText(text);
  
  // Преобразуем переносы в <br> теги
  return cleaned.replace(/\n/g, '<br>');
};