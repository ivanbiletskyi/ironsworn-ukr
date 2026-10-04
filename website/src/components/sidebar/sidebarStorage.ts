// Що з бічного меню пам'ятаємо між візитами: які групи розгорнуті чи згорнуті
// і які сторінки вже переглянуто. Лише в браузері — це зручність, а не дані
// акаунта.

/** { [ключ групи]: розгорнута } — лише групи, які гравець перемикав сам. */
export const GROUPS_KEY = 'ironsworn-sidebar-groups-v1';
export const VISITED_KEY = 'ironsworn-sidebar-visited-v1';

export function loadFlags(key: string): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((e): e is [string, boolean] => typeof e[1] === 'boolean'),
    );
  } catch {
    return {};
  }
}

export function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

export function save(key: string, value: Set<string> | Record<string, boolean>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value instanceof Set ? [...value] : value));
  } catch {
    // Приватний режим чи заблоковане сховище — меню працює й без пам'яті.
  }
}
