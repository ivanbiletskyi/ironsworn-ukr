// Що з бічного меню пам'ятаємо між візитами: розгорнуті глави і переглянуті
// сторінки. Лише в браузері — це зручність, а не дані акаунта.

export const OPEN_CHAPTERS_KEY = 'ironsworn-sidebar-open-v1';
export const VISITED_KEY = 'ironsworn-sidebar-visited-v1';

export function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveSet(key: string, value: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // Приватний режим чи заблоковане сховище — меню працює й без пам'яті.
  }
}
