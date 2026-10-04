// Що з бічного меню пам'ятаємо між візитами: які групи розгорнуті чи згорнуті.
// Лише в браузері — це зручність, а не дані акаунта.

/** { [ключ групи]: розгорнута } — лише групи, які гравець перемикав сам. */
export const GROUPS_KEY = 'ironsworn-sidebar-groups-v1';

// Ключі попередніх версій меню: список переглянутих сторінок (трекінг
// прибрано) і розгорнуті глави до переходу на GROUPS_KEY.
const LEGACY_KEYS = ['ironsworn-sidebar-visited-v1', 'ironsworn-sidebar-open-v1'];

export function dropLegacyKeys(): void {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // Сховище недоступне — тоді й прибирати нічого.
  }
}

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

export function save(key: string, value: Record<string, boolean>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Приватний режим чи заблоковане сховище — меню працює й без пам'яті.
  }
}
