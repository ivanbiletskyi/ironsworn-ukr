// Нормалізація українського тексту для пошуку й звіряння назв ходів:
// регістр, апострофи (ʼ ’ ' `), ї/і, є/е, ґ/г, розмітка `*`.

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_]/g, '')
    .replace(/[ʼ’'`]/g, '')
    .replace(/ї/g, 'і')
    .replace(/є/g, 'е')
    .replace(/ґ/g, 'г')
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Слова тексту після нормалізації, без розділових знаків. */
export function words(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}/]+/u)
    .filter(Boolean);
}

/**
 * Основа слова — перші 4–5 літер, щоб «лікую» знаходило «Лікувати», а
 * «тікаю» — «тікати». Короткі слова лишаються як є.
 */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.slice(0, Math.max(4, Math.min(5, word.length - 2)));
}
